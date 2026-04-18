import { useState } from "react";
import { MessageCircle, Mail, Feather, VolumeX, Eye } from "lucide-react";
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

export function GifInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-muted-foreground">
      <p className="leading-relaxed">
        <span className="font-medium text-foreground">What's a GIF?</span> A short
        looping animation — share it instantly via{" "}
        <MessageCircle className="inline h-3 w-3 -mt-0.5" /> text or{" "}
        <Mail className="inline h-3 w-3 -mt-0.5" /> email.{" "}
        <Feather className="inline h-3 w-3 -mt-0.5" /> Lightweight (much smaller
        than video) and <VolumeX className="inline h-3 w-3 -mt-0.5" /> silent
        (no sound).
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <Eye className="h-3 w-3" />
            See an example
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Photo → Animated GIF</DialogTitle>
            <DialogDescription>
              From a still photo to a lively, shareable greeting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
