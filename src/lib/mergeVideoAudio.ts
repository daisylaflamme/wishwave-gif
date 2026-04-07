import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function mergeVideoAudio(
  videoUrl: string,
  audioUrl: string,
  outputName: string
): Promise<Blob> {
  const ff = await getFFmpeg();

  // Fetch both files
  const videoData = await fetchFile(videoUrl);
  const audioData = await fetchFile(audioUrl);

  await ff.writeFile("input.mp4", videoData);
  await ff.writeFile("input.mp3", audioData);

  // Merge: copy video codec, encode audio as AAC, trim to shortest (5s video)
  await ff.exec([
    "-i", "input.mp4",
    "-i", "input.mp3",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "128k",
    "-t", "5",
    "-af", "afade=t=out:st=4.5:d=0.5",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-shortest",
    "-movflags", "+faststart",
    "-y",
    "output.mp4",
  ]);

  const data = await ff.readFile("output.mp4");
  const blob = new Blob([data], { type: "video/mp4" });

  // Cleanup
  await ff.deleteFile("input.mp4");
  await ff.deleteFile("input.mp3");
  await ff.deleteFile("output.mp4");

  return blob;
}
