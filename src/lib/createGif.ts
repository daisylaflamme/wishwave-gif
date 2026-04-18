import { encode } from "modern-gif";
// Vite worker URL — bundled and served as a static asset, runs encoding off main thread.
import gifWorkerUrl from "modern-gif/worker?url";

const GIF_FPS = 10;
const GIF_DURATION_SECONDS = 5;
const FRAME_DELAY = Math.round(1000 / GIF_FPS);
const TOTAL_FRAMES = GIF_DURATION_SECONDS * GIF_FPS; // 50
const MAX_WIDTH = 512;

async function fetchVideoBlob(videoUrl: string): Promise<string> {
  const proxyResponse = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ url: videoUrl }),
    }
  );

  if (!proxyResponse.ok) {
    throw new Error(`Failed to fetch video: ${proxyResponse.status}`);
  }

  const blob = await proxyResponse.blob();
  return URL.createObjectURL(blob);
}

function drawOverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number
) {
  const fontSize = Math.round(height * 0.065);
  ctx.font = `700 ${fontSize}px 'DejaVu Sans', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = width - 40;
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

  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight + 20;
  const boxY = height - blockHeight - 12;

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(10, boxY, width - 20, blockHeight);

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 6;

  const startY = boxY + blockHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight, maxWidth);
  });

  ctx.shadowBlur = 0;
}

// Yield to the browser between heavy ops so the UI thread can paint progress.
const yieldToMain = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

export async function createGif(
  videoUrl: string,
  overlayText?: string | null,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const localUrl = await fetchVideoBlob(videoUrl);

  try {
    const video = document.createElement("video");
    video.src = localUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    // crossOrigin not needed — blob URL is same-origin.

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
    });

    // Downscale to MAX_WIDTH while preserving aspect ratio (and keeping even dimensions).
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const scale = Math.min(1, MAX_WIDTH / srcW);
    const gifWidth = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const gifHeight = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    // Use OffscreenCanvas when available to keep work off the main canvas pipeline.
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(gifWidth, gifHeight)
        : Object.assign(document.createElement("canvas"), {
            width: gifWidth,
            height: gifHeight,
          });
    if ("width" in canvas) {
      canvas.width = gifWidth;
      canvas.height = gifHeight;
    }
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext(
      "2d"
    ) as CanvasRenderingContext2D;
    // Lower-quality scaling = faster on mobile and good enough for GIF.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";

    const normalizedText = overlayText?.trim() ?? "";
    const hasOverlay = normalizedText.length > 0;

    const frames: { data: Uint8ClampedArray; delay: number }[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const time = i / GIF_FPS;
      // Seek and wait — fast on small downscaled draws.
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          video.removeEventListener("error", onErr);
          resolve();
        };
        const onErr = () => {
          video.removeEventListener("seeked", onSeeked);
          video.removeEventListener("error", onErr);
          reject(new Error("Video seek failed"));
        };
        video.addEventListener("seeked", onSeeked);
        video.addEventListener("error", onErr);
        video.currentTime = time;
      });

      ctx.drawImage(video, 0, 0, gifWidth, gifHeight);

      if (hasOverlay) {
        drawOverlayText(ctx, normalizedText, gifWidth, gifHeight);
      }

      const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
      frames.push({
        data: imageData.data,
        delay: FRAME_DELAY,
      });

      // Capture phase = 0–80% of progress; yield so the UI can repaint.
      onProgress?.(Math.round(((i + 1) / TOTAL_FRAMES) * 80));
      if (i % 3 === 0) await yieldToMain();
    }

    onProgress?.(82);
    await yieldToMain();

    // Encode in a Web Worker so the UI thread stays responsive.
    const output = await encode({
      width: gifWidth,
      height: gifHeight,
      frames: frames.map((f) => ({
        data: f.data.buffer as ArrayBuffer,
        delay: f.delay,
      })),
      maxColors: 128,
      workerUrl: gifWorkerUrl,
    });

    onProgress?.(100);

    return new Blob([output], { type: "image/gif" });
  } finally {
    URL.revokeObjectURL(localUrl);
  }
}
