import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

const CLIP_DURATION_SECONDS = 5;
const FONT_ASSET_PATH = "/assets/fonts/DejaVuSans-Bold.ttf";

function escapeDrawtextValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, "\\n");
}

function buildOverlayFilter(message: string) {
  return [
    "drawtext=fontfile=overlay-font.ttf",
    `text='${escapeDrawtextValue(message)}'`,
    "fontcolor=white",
    "fontsize=44",
    "line_spacing=8",
    "box=1",
    "boxcolor=black@0.24",
    "boxborderw=20",
    "borderw=2",
    "bordercolor=black@0.55",
    "shadowcolor=black@0.45",
    "shadowx=0",
    "shadowy=2",
    "x=(w-text_w)/2",
    "y=h-th-44",
  ].join(":");
}

async function cleanupFiles(ff: FFmpeg, files: string[]) {
  await Promise.allSettled(files.map((file) => ff.deleteFile(file)));
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Use UMD (single-threaded) build — no SharedArrayBuffer needed
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function mergeVideoAudio(
  videoUrl: string,
  audioUrl: string,
  _outputName: string,
  overlayText?: string | null,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const normalizedText = overlayText?.trim() ?? "";
  const hasOverlay = normalizedText.length > 0;
  const filesToCleanup = ["input.mp4", "input.mp3", "output.mp4"];

  try {
    const [videoData, audioData] = await Promise.all([fetchFile(videoUrl), fetchFile(audioUrl)]);

    await ff.writeFile("input.mp4", videoData);
    await ff.writeFile("input.mp3", audioData);

    const command = [
      "-i", "input.mp4",
      "-i", "input.mp3",
      "-map", "0:v:0",
      "-map", "1:a:0",
    ];

    if (hasOverlay) {
      const fontData = await fetchFile(FONT_ASSET_PATH);
      await ff.writeFile("overlay-font.ttf", fontData);
      filesToCleanup.push("overlay-font.ttf");

      command.push(
        "-vf", buildOverlayFilter(normalizedText),
        "-c:v", "mpeg4",
        "-q:v", "3",
        "-pix_fmt", "yuv420p",
      );
    } else {
      command.push("-c:v", "copy");
    }

    command.push(
      "-c:a", "aac",
      "-b:a", "128k",
      "-t", String(CLIP_DURATION_SECONDS),
      "-af", `afade=t=out:st=${CLIP_DURATION_SECONDS - 0.5}:d=0.5`,
      "-shortest",
      "-movflags", "+faststart",
      "-y",
      "output.mp4",
    );

    await ff.exec(command);

    const data = await ff.readFile("output.mp4") as Uint8Array;
    return new Blob([new Uint8Array(data)], { type: "video/mp4" });
  } finally {
    await cleanupFiles(ff, filesToCleanup);
  }
}
