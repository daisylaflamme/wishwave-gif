/**
 * Burns a greeting message into an MP4 using ffmpeg.wasm.
 *
 * Strategy:
 *   1. Render the message to a transparent PNG via canvas (matching the WebP/GIF
 *      overlay style — bottom band, white text with shadow over a dark gradient).
 *   2. Use ffmpeg `overlay` filter to composite the PNG onto the source video.
 *   3. Re-encode video with libx264 (yuv420p) and copy audio if present so the
 *      result plays everywhere social media platforms accept MP4.
 *
 * Single-threaded core lives at /assets/ffmpeg/ — no COOP/COEP headers needed.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const FFMPEG_BASE = "/assets/ffmpeg";
// Public CDN fallback — used when same-origin loading fails (e.g. the
// Lovable preview domain redirects through an auth bridge for static assets,
// which breaks the ffmpeg worker's importScripts call).
const FFMPEG_CDN = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function loadCoreBlobs(base: string) {
  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  ]);
  return { coreURL, wasmURL };
}

async function getFfmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;
  ffmpegPromise = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => onLog?.(message));

    // Try same-origin first (fast, offline-friendly), fall back to CDN if the
    // hosting environment redirects/blocks the static asset.
    try {
      const local = await loadCoreBlobs(FFMPEG_BASE);
      await ffmpeg.load(local);
    } catch (localErr) {
      console.warn("ffmpeg local core load failed, falling back to CDN", localErr);
      const cdn = await loadCoreBlobs(FFMPEG_CDN);
      await ffmpeg.load(cdn);
    }
    return ffmpeg;
  })();
  ffmpegPromise.catch(() => {
    // Reset so a later retry can attempt loading again.
    ffmpegPromise = null;
  });
  return ffmpegPromise;
}

/** Render the overlay text onto a transparent canvas matching the video size. */
function renderOverlayPng(text: string, width: number, height: number): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);

  // Bottom gradient band (matches preview & WebP/GIF overlay).
  const gradH = Math.round(height * 0.32);
  const grad = ctx.createLinearGradient(0, height - gradH, 0, height);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.3)");
  grad.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, height - gradH, width, gradH);

  // Word-wrap text.
  const fontSize = Math.round(height * 0.06);
  ctx.font = `700 ${fontSize}px 'DejaVu Sans', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = width - 60;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.25;
  const blockHeight = lines.length * lineHeight;
  const startY = height - Math.round(height * 0.05) - blockHeight + lineHeight / 2;

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight, maxWidth);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error("Failed to render overlay PNG"));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/png",
    );
  });
}

/** Probe a video's pixel dimensions by loading it into a hidden <video> element. */
function probeDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const dims = { width: video.videoWidth, height: video.videoHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read video metadata"));
    };
  });
}

export interface BurnInOptions {
  videoBlob: Blob;
  text: string;
  onProgress?: (pct: number) => void;
}

/**
 * Returns a new MP4 Blob with the message burned into the pixels.
 * Audio (if present) is copied through without re-encoding.
 */
export async function burnMessageIntoMp4({
  videoBlob,
  text,
  onProgress,
}: BurnInOptions): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) return videoBlob;

  onProgress?.(2);
  const { width, height } = await probeDimensions(videoBlob);
  const overlayPng = await renderOverlayPng(trimmed, width, height);
  onProgress?.(8);

  const ffmpeg = await getFfmpeg();
  onProgress?.(15);

  // ffmpeg.wasm reports decoded-time progress between 0..1.
  const progressHandler = ({ progress }: { progress: number }) => {
    if (progress > 0 && progress <= 1) {
      onProgress?.(15 + Math.round(progress * 80));
    }
  };
  ffmpeg.on("progress", progressHandler);

  const inputName = "in.mp4";
  const overlayName = "overlay.png";
  const outputName = "out.mp4";

  try {
    await ffmpeg.writeFile(inputName, new Uint8Array(await videoBlob.arrayBuffer()));
    await ffmpeg.writeFile(overlayName, overlayPng);

    // -c:a copy works when source has audio; if not present ffmpeg ignores it
    // when we use `-map 0:a?` (optional audio stream).
    await ffmpeg.exec([
      "-i", inputName,
      "-i", overlayName,
      "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto[v]",
      "-map", "[v]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "copy",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    onProgress?.(100);
    return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", progressHandler);
    // Best-effort cleanup; ignore failures.
    for (const name of [inputName, overlayName, outputName]) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        /* noop */
      }
    }
  }
}
