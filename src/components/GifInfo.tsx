import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageOff, Loader2 } from "lucide-react";
import exampleBefore from "@/assets/example-before.png";
import exampleAfter from "@/assets/example-after.gif";

interface GifInfoProps {
  variant?: "link";
}

type LoadState = "loading" | "loaded" | "error";

function PreviewImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  const [state, setState] = useState<LoadState>("loading");

  return (
    <figure className="space-y-2">
      <div className="relative w-full aspect-square rounded-lg border border-border overflow-hidden bg-muted">
        {state === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading preview…</span>
          </div>
        )}
        {state === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            <span>Preview unavailable</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setState("loaded")}
            onError={() => setState("error")}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              state === "loaded" ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
      <figcaption className="text-xs text-center text-muted-foreground font-medium">
        {caption}
      </figcaption>
    </figure>
  );
}

export function GifInfo({ variant = "link" }: GifInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs font-medium text-primary underline underline-offset-2 decoration-primary/60 hover:decoration-primary hover:text-primary/80 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          What is a GIF?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Photo → Animated GIF</DialogTitle>
          <DialogDescription>
            A short looping animation — share it instantly via text or email.
            Lightweight (much smaller than video) and silent (no sound).
          </DialogDescription>
        </DialogHeader>
        {open && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <PreviewImage
              src={exampleBefore}
              alt="Original photo before animation"
              caption="Before — your photo"
            />
            <PreviewImage
              src={exampleAfter}
              alt="Animated GIF greeting result"
              caption="After — animated GIF"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
