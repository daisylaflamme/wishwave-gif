import { encode } from "modern-gif";

const GIF_FPS = 10;
const GIF_DURATION_SECONDS = 5;
const FRAME_DELAY = Math.round(1000 / GIF_FPS);
const TOTAL_FRAMES = GIF_DURATION_SECONDS * GIF_FPS;

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
    video.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
    });

    const scale = GIF_WIDTH / video.videoWidth;
    const gifHeight = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = GIF_WIDTH;
    canvas.height = gifHeight;
    const ctx = canvas.getContext("2d")!;

    const normalizedText = overlayText?.trim() ?? "";
    const hasOverlay = normalizedText.length > 0;

    const frames: { data: ImageData; delay: number }[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const time = i / GIF_FPS;
      video.currentTime = time;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      ctx.drawImage(video, 0, 0, GIF_WIDTH, gifHeight);

      if (hasOverlay) {
        drawOverlayText(ctx, normalizedText, GIF_WIDTH, gifHeight);
      }

      frames.push({
        data: ctx.getImageData(0, 0, GIF_WIDTH, gifHeight),
        delay: FRAME_DELAY,
      });

      onProgress?.(Math.round(((i + 1) / TOTAL_FRAMES) * 90));
    }

    onProgress?.(92);

    const output = await encode({
      width: GIF_WIDTH,
      height: gifHeight,
      frames: frames.map((f) => ({
        data: f.data.data,
        delay: f.delay,
      })),
      maxColors: 128,
    });

    onProgress?.(100);

    return new Blob([output], { type: "image/gif" });
  } finally {
    URL.revokeObjectURL(localUrl);
  }
}
