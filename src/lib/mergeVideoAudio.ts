import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { STATIC_AUDIO_PATH } from "@/lib/constants";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

const CLIP_DURATION_SECONDS = 5;

async function fetchVideoForMerge(videoUrl: string): Promise<Uint8Array> {
  const proxyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ url: videoUrl }),
  });

  if (!proxyResponse.ok) {
    const errorText = await proxyResponse.text();
    throw new Error(`Failed to fetch source video for export: ${proxyResponse.status} ${errorText}`);
  }

  return new Uint8Array(await proxyResponse.arrayBuffer());
}

async function createOverlayImage(message: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 48px 'DejaVu Sans', Arial, sans-serif";

  const maxWidth = canvas.width - 160;
  const words = message.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);

  const lineHeight = 60;
  const textBlockHeight = Math.max(lines.length, 1) * lineHeight;
  const boxHeight = textBlockHeight + 48;
  const boxY = canvas.height - boxHeight - 28;

  context.fillStyle = "rgba(0, 0, 0, 0.36)";
  context.fillRect(48, boxY, canvas.width - 96, boxHeight);

  context.strokeStyle = "rgba(0, 0, 0, 0.5)";
  context.lineWidth = 3;
  context.strokeRect(48, boxY, canvas.width - 96, boxHeight);

  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 10;

  const startY = boxY + boxHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, startY + index * lineHeight, maxWidth);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) resolve(pngBlob);
      else reject(new Error("Failed to render the message overlay"));
    }, "image/png");
  });

  return fetchFile(blob);
}

async function cleanupFiles(ff: FFmpeg, files: string[]) {
  await Promise.allSettled(files.map((file) => ff.deleteFile(file)));
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const instance = new FFmpeg();
    const assetBaseUrl = new URL("/assets/ffmpeg/", window.location.origin).href;

    console.info("Loading local FFmpeg core from:", assetBaseUrl);

    try {
      await instance.load({
        coreURL: await toBlobURL(`${assetBaseUrl}ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${assetBaseUrl}ffmpeg-core.wasm`, "application/wasm"),
      });

      ffmpeg = instance;
      return instance;
    } catch (error) {
      ffmpeg = null;
      console.error("Failed to load local FFmpeg core", error);
      throw error;
    } finally {
      ffmpegLoadPromise = null;
    }
  })();

  return ffmpegLoadPromise;
}

export async function mergeVideoAudio(
  videoUrl: string,
  _audioUrl: string,
  _outputName: string,
  overlayText?: string | null,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const normalizedText = overlayText?.trim() ?? "";
  const hasOverlay = normalizedText.length > 0;
  const filesToCleanup = ["input.mp4", "input.m4a", "output.mp4", "probe.txt"];

  try {
    const [videoData, audioData] = await Promise.all([fetchVideoForMerge(videoUrl), fetchFile(STATIC_AUDIO_PATH)]);

    await ff.writeFile("input.mp4", videoData);
    await ff.writeFile("input.m4a", audioData);

    const command = ["-i", "input.mp4", "-i", "input.m4a"];

    if (hasOverlay) {
      const overlayData = await createOverlayImage(normalizedText);
      await ff.writeFile("overlay.png", overlayData);
      filesToCleanup.push("overlay.png");

      command.push(
        "-i", "overlay.png",
        "-filter_complex", "[0:v][2:v]overlay=0:0:format=auto[vout]",
        "-map", "[vout]",
        "-map", "1:a:0",
        "-c:v", "mpeg4",
        "-q:v", "3",
        "-pix_fmt", "yuv420p",
      );
    } else {
      command.push(
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
      );
    }

    command.push(
      "-c:a", "copy",
      "-t", String(CLIP_DURATION_SECONDS),
      "-af", `afade=t=out:st=${CLIP_DURATION_SECONDS - 0.5}:d=0.5`,
      "-shortest",
      "-movflags", "+faststart",
      "-y",
      "output.mp4",
    );

    console.info("Running media merge command:", command.join(" "));

    await ff.exec(command);

    await ff.ffprobe([
      "-v", "error",
      "-show_entries", "stream=codec_type",
      "-of", "default=noprint_wrappers=1:nokey=1",
      "output.mp4",
      "-o", "probe.txt",
    ]);

    const probeOutput = await ff.readFile("probe.txt", "utf8") as string;
    console.info("Merged output streams:", probeOutput);

    const hasVideoStream = probeOutput.includes("video");
    const hasAudioStream = probeOutput.includes("audio");

    if (!hasVideoStream || !hasAudioStream) {
      throw new Error("Merged MP4 validation failed: missing audio or video stream");
    }

    const data = await ff.readFile("output.mp4") as Uint8Array;
    return new Blob([new Uint8Array(data)], { type: "video/mp4" });
  } finally {
    await cleanupFiles(ff, filesToCleanup);
  }
}
