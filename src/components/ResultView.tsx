import { useRef, useEffect, useState } from "react";
import { Download, RotateCcw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mergeVideoAudio } from "@/lib/mergeVideoAudio";

interface ResultViewProps {
  videoUrl: string;
  audioUrl: string;
  recipientName?: string | null;
  onCreateAnother: () => void;
}

export function ResultView({ videoUrl, audioUrl, recipientName, onCreateAnother }: ResultViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const greetingText = recipientName
    ? `Happy Birthday, ${recipientName}!`
    : "Happy Birthday!";

  const togglePlay = () => {
    if (!videoRef.current || !audioRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      audioRef.current.pause();
    } else {
      videoRef.current.currentTime = 0;
      audioRef.current.currentTime = 0;
      videoRef.current.play();
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Simple download of just the video for now
      // Full ffmpeg.wasm merge can be added later
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wishwave-${recipientName || "greeting"}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Video with text overlay */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-primary/10">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          playsInline
          muted
        />
        <audio ref={audioRef} src={audioUrl} preload="auto" />

        {/* Greeting text overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 pb-8 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
          <p
            className="text-center font-bold drop-shadow-lg"
            style={{
              fontSize: "clamp(1.25rem, 4vw, 2rem)",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)",
              letterSpacing: "0.02em",
            }}
          >
            {greetingText}
          </p>
        </div>

        {/* Play button overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors group"
        >
          <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            {isPlaying ? (
              <Pause className="h-7 w-7" style={{ color: "white" }} />
            ) : (
              <Play className="h-7 w-7 ml-1" style={{ color: "white" }} />
            )}
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button onClick={handleDownload} disabled={downloading} className="gap-2">
          <Download className="h-4 w-4" />
          {downloading ? "Preparing..." : "Download MP4"}
        </Button>
        <Button variant="outline" onClick={onCreateAnother} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Create Another
        </Button>
      </div>
    </div>
  );
}
