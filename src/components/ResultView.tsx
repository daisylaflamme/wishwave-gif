import { useEffect, useRef, useState } from "react";
import {
  Download,
  RotateCcw,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Mail,
  Share2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGif } from "@/lib/createGif";
import { createWebp } from "@/lib/createWebp";
import { toast } from "sonner";
import { isNativeApp, nativeShare, openExternal, saveToDevice } from "@/lib/platform";

interface ResultViewProps {
  videoUrl: string;
  recipientMessage?: string | null;
  onCreateAnother: () => void;
}

type ExportFormat = "mp4" | "webp" | "gif";

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  mp4: "video/mp4",
  webp: "image/webp",
  gif: "image/gif",
};

const SHARE_TEXT = "Check out my AI-generated GifSpark animation ✨";

// Brand icons (inline SVG, sized 16px)
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26L3.7 19.05l3.954-1.057zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.298-.496.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

export function ResultView({ videoUrl, recipientMessage, onCreateAnother }: ResultViewProps) {
  const hasMessage = !!recipientMessage?.trim();

  // Lazy export cache — nothing is encoded until the user asks for it.
  // MP4 cache is split: "clean" (raw Runway output) vs "burned" (with text baked in).
  const [cache, setCache] = useState<{
    mp4Clean?: Blob;
    mp4Burned?: Blob;
    webp?: Blob;
    gif?: Blob;
  }>({});
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ExportFormat, string>>>({});
  const [showGif, setShowGif] = useState(false);
  // Default ON when there's a message — most users want it baked in for sharing.
  const [burnInMessage, setBurnInMessage] = useState(true);

  // Video preview state
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset preview state when source changes.
  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
  }, [videoUrl]);

  const fileLabel =
    (recipientMessage || "greeting")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "greeting";
  const filenameFor = (format: ExportFormat) => `gifspark-${fileLabel}.${format}`;

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveOrShare = async (blob: Blob, format: ExportFormat) => {
    const filename = filenameFor(format);
    if (isNativeApp()) {
      const uri = await saveToDevice(blob, filename);
      if (uri) {
        toast.success("Saved to Files", {
          description: "Tap Share to send it anywhere.",
          action: { label: "Share", onClick: () => shareBlob(blob, format) },
        });
        return;
      }
      await shareBlob(blob, format);
      return;
    }
    downloadBlob(blob, filename);
  };

  /** Fetch the raw Runway MP4 once and cache it. */
  const fetchCleanMp4 = async (): Promise<Blob> => {
    if (cache.mp4Clean) return cache.mp4Clean;
    const res = await fetch(videoUrl);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 410) {
        throw new Error("This video link has expired. Please regenerate from a fresh creation.");
      }
      throw new Error(`Couldn't download the video (status ${res.status}).`);
    }
    let blob = await res.blob();
    if (blob.type !== MIME_BY_FORMAT.mp4) {
      blob = new Blob([blob], { type: MIME_BY_FORMAT.mp4 });
    }
    setCache((prev) => ({ ...prev, mp4Clean: blob }));
    return blob;
  };

  /** Resolve which MP4 variant to deliver based on the current toggle. */
  const wantsBurnedMp4 = () => burnInMessage && hasMessage;

  /** Ensure we have a blob for the requested format (encode lazily if needed). */
  const ensureBlob = async (format: ExportFormat): Promise<Blob | null> => {
    if (format === "mp4") {
      const burned = wantsBurnedMp4();
      const cached = burned ? cache.mp4Burned : cache.mp4Clean;
      if (cached) return cached;
    } else {
      const cached = cache[format];
      if (cached) return cached;
    }

    if (exporting) {
      toast.info("Already preparing a download — hang tight.");
      return null;
    }

    setExporting(format);
    setExportProgress(0);
    setExportStage(null);
    setErrors((prev) => ({ ...prev, [format]: undefined }));

    try {
      let blob: Blob;
      if (format === "mp4") {
        if (wantsBurnedMp4()) {
          setExportStage("Fetching video…");
          const clean = await fetchCleanMp4();
          setExportStage("Adding your message…");
          blob = await burnMessageIntoMp4({
            videoBlob: clean,
            text: recipientMessage!.trim(),
            onProgress: setExportProgress,
          });
          setCache((prev) => ({ ...prev, mp4Burned: blob }));
        } else {
          setExportStage("Downloading…");
          blob = await fetchCleanMp4();
          setExportProgress(100);
        }
      } else if (format === "webp") {
        blob = await createWebp(videoUrl, recipientMessage, setExportProgress);
        setCache((prev) => ({ ...prev, webp: blob }));
      } else {
        blob = await createGif(videoUrl, recipientMessage, setExportProgress);
        setCache((prev) => ({ ...prev, gif: blob }));
      }

      return blob;
    } catch (err) {
      console.error(`${format} export failed:`, err);

      const rawMessage = err instanceof Error ? err.message : String(err);
      const isWasmError =
        /WebAssembly|wasm|CompileError|magic word|Aborted\(/i.test(rawMessage);

      let friendlyMessage: string;
      if (format === "webp" && isWasmError) {
        friendlyMessage = "Animated WebP is temporarily unavailable. MP4 download is recommended.";
      } else if (format === "gif" && isWasmError) {
        friendlyMessage = "GIF export is temporarily unavailable. MP4 download is recommended.";
      } else if (format === "mp4" && wantsBurnedMp4() && isWasmError) {
        friendlyMessage = "Couldn't bake the message into MP4. Turn off \"Include message in video\" to download the clean version.";
      } else if (format === "mp4") {
        friendlyMessage = rawMessage.startsWith("Couldn't") || rawMessage.startsWith("This video")
          ? rawMessage
          : "Couldn't prepare MP4. Please try again.";
      } else {
        friendlyMessage = `Couldn't prepare ${format.toUpperCase()}. Your MP4 download is still available.`;
      }

      setErrors((prev) => ({ ...prev, [format]: friendlyMessage }));
      const others =
        format === "mp4"
          ? "You can still try WebP or GIF below."
          : "Your MP4 download is still available.";
      toast.error(friendlyMessage, { description: others });
      return null;
    } finally {
      setExporting(null);
      setExportProgress(0);
      setExportStage(null);
    }
  };

  const handleDownload = async (format: ExportFormat) => {
    const blob = await ensureBlob(format);
    if (!blob) return;
    await saveOrShare(blob, format);
  };

  const shareUrl = videoUrl;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  };

  const openShare = (url: string) => {
    if (isNativeApp()) {
      openExternal(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleWhatsApp = () =>
    openShare(`https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl}`)}`);
  const handleFacebook = () =>
    openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  const handleX = () =>
    openShare(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(shareUrl)}`,
    );
  const handleEmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent("My GifSpark animation")}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${shareUrl}`)}`;
    if (isNativeApp()) {
      openExternal(mailto);
    } else {
      window.location.href = mailto;
    }
  };

  /** Save MP4 to device (Instagram supports MP4 natively for Reels/Stories). */
  const handleInstagram = async () => {
    const blob = await ensureBlob("mp4");
    if (blob) {
      if (isNativeApp()) {
        await saveToDevice(blob, filenameFor("mp4"));
      } else {
        downloadBlob(blob, filenameFor("mp4"));
      }
    }
    toast("Saved! Now upload it to Instagram", {
      description: "Open Instagram and post your video as a Reel or Story.",
    });
  };

  const shareBlob = async (blob: Blob, format: ExportFormat) => {
    const filename = filenameFor(format);
    const mime = MIME_BY_FORMAT[format];
    if (isNativeApp()) {
      const ok = await nativeShare({
        blob,
        filename,
        title: "GifSpark animation",
        text: SHARE_TEXT,
      });
      if (!ok) await handleCopyLink();
      return;
    }
    try {
      const file = new File([blob], filename, { type: mime });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "GifSpark animation", text: SHARE_TEXT });
      } else if (navigator.share) {
        await navigator.share({ title: "GifSpark animation", text: SHARE_TEXT, url: shareUrl });
      } else {
        await handleCopyLink();
      }
    } catch {
      // user dismissed — silent
    }
  };

  /** Native share entry point — uses MP4 (universal compatibility, no encoding wait). */
  const handleNativeShare = async () => {
    const blob = await ensureBlob("mp4");
    if (blob) await shareBlob(blob, "mp4");
  };

  const canNativeShare =
    isNativeApp() || (typeof navigator !== "undefined" && "share" in navigator);

  const exportLabel = (format: ExportFormat, base: string) => {
    if (exporting === format) {
      if (format === "mp4") {
        if (exportStage && exportProgress > 0 && exportProgress < 100) {
          return `${exportStage} ${exportProgress}%`;
        }
        return exportStage ?? "Downloading…";
      }
      return `Encoding ${format.toUpperCase()}… ${exportProgress}%`;
    }
    return base;
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Success banner */}
      {videoReady && (
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground animate-in fade-in slide-in-from-top-2 duration-500">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Your animation is ready
        </div>
      )}

      {/* MP4 preview */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-primary/10 bg-muted min-h-[200px] flex items-center justify-center">
        {videoReady && !videoError && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-foreground border border-border shadow-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-generated
          </span>
        )}

        {!videoError ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedData={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
              className={`w-full ${videoReady ? "block" : "hidden"}`}
            />
            {!videoReady && (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading preview…</p>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm text-destructive font-medium">
              Couldn't load preview
            </p>
            <p className="text-xs text-muted-foreground">
              The video link may have expired. Try creating a new one.
            </p>
          </div>
        )}

        {videoReady && !videoError && recipientMessage?.trim() && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 pt-10 bg-gradient-to-t from-black/65 via-black/25 to-transparent">
            <p
              className="text-center font-bold text-white text-lg sm:text-xl leading-tight tracking-tight break-words max-w-full"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.8)" }}
            >
              {recipientMessage.trim()}
            </p>
          </div>
        )}
      </div>

      {/* Download buttons */}
      <div className="space-y-2.5">
        {hasMessage && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card/40 p-3">
            <div className="space-y-0.5 min-w-0">
              <Label
                htmlFor="burn-in-toggle"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Include message in video
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Bakes your greeting into the MP4 so it shows on social media. Adds a few seconds to download.
              </p>
            </div>
            <Switch
              id="burn-in-toggle"
              checked={burnInMessage}
              onCheckedChange={setBurnInMessage}
              disabled={!!exporting}
            />
          </div>
        )}

        <Button
          onClick={() => handleDownload("mp4")}
          disabled={!!exporting || videoError}
          className="w-full gap-2"
          size="lg"
        >
          {exporting === "mp4" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exportLabel("mp4", wantsBurnedMp4() ? "Download MP4 with message" : "Download MP4")}
        </Button>

        <Button
          variant="outline"
          onClick={() => handleDownload("webp")}
          disabled={!!exporting || videoError}
          className="w-full gap-2"
        >
          {exporting === "webp" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exportLabel("webp", "Download Animated WebP")}
        </Button>

        {errors.webp && (
          <p className="text-[11px] text-destructive text-center">{errors.webp}</p>
        )}

        {/* GIF — collapsed compatibility option */}
        {!showGif ? (
          <button
            type="button"
            onClick={() => setShowGif(true)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1 pt-1"
          >
            <ChevronDown className="h-3 w-3" />
            More format options
          </button>
        ) : (
          <div className="pt-1 space-y-1.5">
            <Button
              variant="ghost"
              onClick={() => handleDownload("gif")}
              disabled={!!exporting || videoError}
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              size="sm"
            >
              {exporting === "gif" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportLabel("gif", "Download GIF (compatibility mode)")}
            </Button>
            {errors.gif && (
              <p className="text-[11px] text-destructive text-center">{errors.gif}</p>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-1.5">
          MP4 works everywhere. WebP is smaller. GIF is for legacy compatibility.
        </p>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onCreateAnother} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Create Another
        </Button>
      </div>

      {/* Share section */}
      {videoReady && !videoError && (
        <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Share your animation</h3>
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="More share options"
              >
                <Share2 className="h-3.5 w-3.5" />
                More
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <ShareIconButton label="WhatsApp" onClick={handleWhatsApp} icon={<WhatsAppIcon />} />
            <ShareIconButton label="Facebook" onClick={handleFacebook} icon={<FacebookIcon />} />
            <ShareIconButton label="X" onClick={handleX} icon={<XIcon />} />
            <ShareIconButton label="Instagram" onClick={handleInstagram} icon={<InstagramIcon />} />
            <ShareIconButton label="Email" onClick={handleEmail} icon={<Mail className="h-4 w-4" />} />
            <ShareIconButton label="Copy link" onClick={handleCopyLink} icon={<LinkIcon className="h-4 w-4" />} />
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Sharing uses MP4 — works in iMessage, WhatsApp, X, and Instagram.
          </p>
        </div>
      )}
    </div>
  );
}

function ShareIconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <span className="h-11 w-11 rounded-full border border-border bg-background flex items-center justify-center text-foreground/80 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors shadow-sm">
        {icon}
      </span>
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
  );
}
