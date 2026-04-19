import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import exampleBefore from "@/assets/example-before.png";
import exampleAfter from "@/assets/example-after.gif";

interface GifInfoProps {
  /** Render as inline link (default) or as standalone block */
  variant?: "link";
}

export function GifInfo({ variant = "link" }: GifInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground/80 hover:text-primary hover:underline underline-offset-2 transition-colors"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <figure className="space-y-2">
            <img
              src={exampleBefore}
              alt="Original photo before animation"
              className="w-full rounded-lg border border-border"
              loading="lazy"
            />
            <figcaption className="text-xs text-center text-muted-foreground font-medium">
              Before — your photo
            </figcaption>
          </figure>
          <figure className="space-y-2">
            <img
              src={exampleAfter}
              alt="Animated GIF greeting result"
              className="w-full rounded-lg border border-border"
              loading="lazy"
            />
            <figcaption className="text-xs text-center text-muted-foreground font-medium">
              After — animated GIF
            </figcaption>
          </figure>
        </div>
      </DialogContent>
    </Dialog>
  );
}
