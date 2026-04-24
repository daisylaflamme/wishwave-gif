/**
 * Animated WebP encoder.
 *
 * Frame extraction mirrors createGif.ts (same downscale, same overlay text)
 * so output dimensions and look match. Per-frame encoding uses @jsquash/webp
 * (WASM, lazy-loaded). Frames are then muxed into an animated WebP file
 * (RIFF/WEBP/VP8X+ANIM+ANMF) by hand — the spec is small and stable.
 *
 * Result: typically 5–10× smaller than the equivalent GIF, no main-thread
 * canvas freeze on mobile, and no gif.js worker setup overhead.
 */

const WEBP_FPS = 12;
const WEBP_DURATION_SECONDS = 5;
const FRAME_DELAY_MS = Math.round(1000 / WEBP_FPS);
const TOTAL_FRAMES = WEBP_DURATION_SECONDS * WEBP_FPS;
const MAX_WIDTH = 512;
const WEBP_QUALITY = 75;

async function fetchVideoBlob(videoUrl: string): Promise<string> {
  // Supabase signed URLs and same-origin URLs can be fetched directly.
  // Legacy Runway CDN URLs (from old generations) still need the proxy.
  const isSupabaseUrl = videoUrl.includes("/storage/v1/object/");
  const isLegacyRunwayUrl = !isSupabaseUrl;

  let response: Response;
  if (isLegacyRunwayUrl) {
    response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ url: videoUrl }),
    });
  } else {
    response = await fetch(videoUrl);
  }

  if (!response.ok) {
    let message = `Failed to fetch video: ${response.status}`;
    try {
      const data = await response.clone().json();
      if (data?.expired || response.status === 410) {
        message = "This video link has expired. Please regenerate from a fresh creation.";
      } else if (data?.error) {
        message = data.error;
      }
    } catch {
      if (response.status === 401 || response.status === 403 || response.status === 410) {
        message = "This video link has expired. Please regenerate from a fresh creation.";
      }
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function drawOverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
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

const yieldToMain = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

// ---------------------------------------------------------------------------
// Animated WebP muxer
// ---------------------------------------------------------------------------
// Spec: https://developers.google.com/speed/webp/docs/riff_container
// We take per-frame WebP bitstreams (from @jsquash/webp), strip their RIFF
// wrapper, and wrap them in ANMF chunks inside a single RIFF/WEBP/VP8X
// container with an ANIM chunk.

function readU32LE(buf: Uint8Array, off: number): number {
  return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24);
}

function writeU24LE(buf: Uint8Array, off: number, v: number) {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
  buf[off + 2] = (v >>> 16) & 0xff;
}

function writeU32LE(buf: Uint8Array, off: number, v: number) {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
  buf[off + 2] = (v >>> 16) & 0xff;
  buf[off + 3] = (v >>> 24) & 0xff;
}

function writeFourCC(buf: Uint8Array, off: number, fourcc: string) {
  for (let i = 0; i < 4; i++) buf[off + i] = fourcc.charCodeAt(i);
}

/** Extract the inner VP8/VP8L chunk (header + payload, no padding) from a static WebP file. */
function extractInnerChunk(webp: Uint8Array): Uint8Array {
  // RIFF header is 12 bytes: "RIFF" <size LE 4> "WEBP"
  // Then chunks follow. Skip optional VP8X / ANIM if present, find the first VP8 / VP8L.
  let off = 12;
  while (off < webp.length) {
    const fourcc = String.fromCharCode(webp[off], webp[off + 1], webp[off + 2], webp[off + 3]);
    const size = readU32LE(webp, off + 4);
    const padded = size + (size & 1); // chunks are padded to even length
    if (fourcc === "VP8 " || fourcc === "VP8L") {
      // Return the chunk header + payload (without trailing padding byte if any).
      return webp.slice(off, off + 8 + size);
    }
    off += 8 + padded;
  }
  throw new Error("WebP frame missing VP8/VP8L chunk");
}

interface FrameInput {
  data: Uint8Array; // single-frame WebP
  delay: number; // ms
}

function buildAnimatedWebp(width: number, height: number, frames: FrameInput[]): Uint8Array {
  // VP8X chunk (10 bytes payload): flags + canvas width-1 (24-bit LE) + canvas height-1 (24-bit LE)
  // Flag bit 1 = animation
  const vp8xPayload = new Uint8Array(10);
  vp8xPayload[0] = 0x02; // animation flag
  writeU24LE(vp8xPayload, 4, width - 1);
  writeU24LE(vp8xPayload, 7, height - 1);

  // ANIM chunk (6 bytes payload): background BGRA + loop count (LE u16)
  const animPayload = new Uint8Array(6);
  animPayload[0] = 0xff; animPayload[1] = 0xff; animPayload[2] = 0xff; animPayload[3] = 0xff; // white bg (unused, frames are full canvas)
  animPayload[4] = 0x00; animPayload[5] = 0x00; // loop forever

  // Build ANMF chunks. Each ANMF payload:
  //   3B x offset (must be even, 0)
  //   3B y offset (must be even, 0)
  //   3B frame width-1
  //   3B frame height-1
  //   3B frame duration ms
  //   1B flags (blend + dispose)
  //   then bitstream (VP8/VP8L chunk)
  const anmfChunks: Uint8Array[] = [];
  for (const frame of frames) {
    const inner = extractInnerChunk(frame.data); // includes its own 8-byte header
    const headerLen = 16;
    const payloadLen = headerLen + inner.length;
    const padded = payloadLen + (payloadLen & 1);
    const chunk = new Uint8Array(8 + padded);
    writeFourCC(chunk, 0, "ANMF");
    writeU32LE(chunk, 4, payloadLen);
    writeU24LE(chunk, 8, 0); // x
    writeU24LE(chunk, 11, 0); // y
    writeU24LE(chunk, 14, width - 1);
    writeU24LE(chunk, 17, height - 1);
    writeU24LE(chunk, 20, frame.delay);
    chunk[23] = 0x02; // dispose=0, blend=1 (no blending → overwrite)
    chunk.set(inner, 24);
    anmfChunks.push(chunk);
  }

  // Total RIFF body = "WEBP" + VP8X chunk + ANIM chunk + all ANMF chunks
  const vp8xChunkLen = 8 + 10; // header + payload (even, no pad)
  const animChunkLen = 8 + 6 + 0; // header + payload (even, no pad)
  const anmfTotal = anmfChunks.reduce((n, c) => n + c.length, 0);
  const bodyLen = 4 + vp8xChunkLen + animChunkLen + anmfTotal;

  const out = new Uint8Array(8 + bodyLen);
  writeFourCC(out, 0, "RIFF");
  writeU32LE(out, 4, bodyLen);
  writeFourCC(out, 8, "WEBP");

  let cursor = 12;
  // VP8X
  writeFourCC(out, cursor, "VP8X");
  writeU32LE(out, cursor + 4, 10);
  out.set(vp8xPayload, cursor + 8);
  cursor += vp8xChunkLen;
  // ANIM
  writeFourCC(out, cursor, "ANIM");
  writeU32LE(out, cursor + 4, 6);
  out.set(animPayload, cursor + 8);
  cursor += animChunkLen;
  // ANMF frames
  for (const chunk of anmfChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  return out;
}

// ---------------------------------------------------------------------------

export async function createWebp(
  videoUrl: string,
  overlayText?: string | null,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const localUrl = await fetchVideoBlob(videoUrl);

  try {
    const video = document.createElement("video");
    video.src = localUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
    });

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const scale = Math.min(1, MAX_WIDTH / srcW);
    const width = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const height = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    if ("width" in canvas) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext(
      "2d",
    ) as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";

    const normalizedText = overlayText?.trim() ?? "";
    const hasOverlay = normalizedText.length > 0;

    // Lazy-load the encoder so its WASM only ships when the user asks for WebP.
    const { encode: encodeWebp } = await import("@jsquash/webp");

    const frames: FrameInput[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const time = i / WEBP_FPS;
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

      ctx.drawImage(video, 0, 0, width, height);
      if (hasOverlay) drawOverlayText(ctx, normalizedText, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const encoded = await encodeWebp(imageData, { quality: WEBP_QUALITY });
      frames.push({ data: new Uint8Array(encoded), delay: FRAME_DELAY_MS });

      onProgress?.(Math.round(((i + 1) / TOTAL_FRAMES) * 90));
      if (i % 2 === 0) await yieldToMain();
    }

    onProgress?.(94);
    await yieldToMain();

    const out = buildAnimatedWebp(width, height, frames);
    onProgress?.(100);

    return new Blob([out], { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(localUrl);
  }
}
