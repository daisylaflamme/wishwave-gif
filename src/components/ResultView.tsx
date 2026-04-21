import { useEffect, useState } from "react";
import { Download, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGif } from "@/lib/createGif";

interface ResultViewProps {
  videoUrl: string;
  recipientMessage?: string | null;
  onCreateAnother: () => void;
}

export function ResultView({ videoUrl, recipientMessage, onCreateAnother }: ResultViewProps) {
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        setProgress(0);
        setError(null);
        const blob = await createGif(videoUrl, recipientMessage, (pct) => {
          if (!cancelled) setProgress(pct);
        });
        if (cancelled) return;
        setGifBlob(blob);
        setGifUrl(URL.createObjectURL(blob));
      } catch (err) {
        if (!cancelled) {
          console.error("GIF creation failed:", err);
          setError("Failed to create your greeting GIF. Please try again.");
        }
      }
    }

    generate();

    return () => {
      cancelled = true;
    };
  }, [videoUrl, recipientMessage]);

  useEffect(() => {
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);

  const handleDownload = () => {
    if (!gifBlob) return;
    const fileLabel = (recipientMessage || "greeting")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "greeting";
    const filename = `wishwave-${fileLabel}.gif`;

    const url = URL.createObjectURL(gifBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-primary/10 bg-muted min-h-[200px] flex items-center justify-center">
        {gifUrl && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-foreground border border-border shadow-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-generated
          </span>
        )}
        {gifUrl ? (
          <img src={gifUrl} alt="Your AI-generated greeting" className="w-full" />
        ) : error ? (
          <div className="p-6 text-center text-destructive text-sm">{error}</div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Creating your greeting... {progress}%
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={handleDownload} disabled={!gifBlob} className="gap-2">
          <Download className="h-4 w-4" />
          {gifBlob ? "Download GIF" : "Preparing..."}
        </Button>
        <Button variant="outline" onClick={onCreateAnother} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Create Another
        </Button>
      </div>
    </div>
  );
}
