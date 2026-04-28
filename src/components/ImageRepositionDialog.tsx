import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  CROP_ASPECT,
  IDENTITY_TRANSFORM,
  type CropTransform,
  clampOffset,
  loadImage,
  renderCrop,
} from "@/lib/imageCrop";

interface Props {
  open: boolean;
  /** The original (uncropped) source file. */
  sourceFile: File | null;
  /** Initial transform to restore (when reopening to re-adjust). */
  initialTransform?: CropTransform;
  onConfirm: (croppedFile: File, transform: CropTransform) => void;
  onCancel: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;

export function ImageRepositionDialog({
  open,
  sourceFile,
  initialTransform,
  onConfirm,
  onCancel,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<CropTransform>(initialTransform ?? IDENTITY_TRANSFORM);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{ id: number; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Load image whenever the source file changes
  useEffect(() => {
    let cancelled = false;
    if (!sourceFile || !open) {
      setImg(null);
      return;
    }
    loadImage(sourceFile)
      .then((loaded) => {
        if (!cancelled) {
          setImg(loaded);
          setTransform(initialTransform ?? IDENTITY_TRANSFORM);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load image");
      });
    return () => {
      cancelled = true;
    };
  }, [sourceFile, open, initialTransform]);

  // Track viewport pixel size (responds to dialog resize)
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewport({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, img]);

  const renderedStyle = useMemo(() => {
    if (!img || !viewport.w || !viewport.h) return undefined as React.CSSProperties | undefined;
    const base = Math.max(viewport.w / img.naturalWidth, viewport.h / img.naturalHeight);
    const finalScale = base * transform.scale;
    const renderedW = img.naturalWidth * finalScale;
    const renderedH = img.naturalHeight * finalScale;
    const left = (viewport.w - renderedW) / 2 + transform.offsetX;
    const top = (viewport.h - renderedH) / 2 + transform.offsetY;
    return {
      position: "absolute" as const,
      left,
      top,
      width: renderedW,
      height: renderedH,
      maxWidth: "none",
      userSelect: "none" as const,
      pointerEvents: "none" as const,
    };
  }, [img, viewport, transform]);

  const applyClamped = useCallback(
    (next: CropTransform) => {
      if (!img) return next;
      const c = clampOffset(
        img.naturalWidth,
        img.naturalHeight,
        viewport.w,
        viewport.h,
        next.scale,
        next.offsetX,
        next.offsetY,
      );
      return { scale: next.scale, offsetX: c.offsetX, offsetY: c.offsetY };
    },
    [img, viewport],
  );

  // Pointer handlers: pan + pinch
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      draggingRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: transform.offsetX,
        startOffsetY: transform.offsetY,
      };
    } else if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchRef.current = { startDist: Math.hypot(dx, dy), startScale: transform.scale };
      draggingRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current && activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchRef.current.startDist;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.startScale * ratio));
      setTransform((t) => applyClamped({ ...t, scale: next }));
      return;
    }

    if (draggingRef.current && draggingRef.current.id === e.pointerId) {
      const dx = e.clientX - draggingRef.current.startX;
      const dy = e.clientY - draggingRef.current.startY;
      setTransform((t) =>
        applyClamped({
          scale: t.scale,
          offsetX: draggingRef.current!.startOffsetX + dx,
          offsetY: draggingRef.current!.startOffsetY + dy,
        }),
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (draggingRef.current?.id === e.pointerId) draggingRef.current = null;
  };

  const handleZoomChange = (vals: number[]) => {
    const next = vals[0];
    setTransform((t) => applyClamped({ ...t, scale: next }));
  };

  const handleReset = () => {
    setTransform(IDENTITY_TRANSFORM);
  };

  const handleConfirm = async () => {
    if (!img || !sourceFile || !viewport.w || !viewport.h) return;
    setBusy(true);
    try {
      const file = await renderCrop(img, viewport.w, viewport.h, transform, sourceFile.name);
      onConfirm(file, transform);
    } catch {
      toast.error("Could not crop image. Please try a different photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reposition photo</DialogTitle>
          <DialogDescription>
            Drag to move and use the slider to zoom. Animations are generated in 16:9 — frame your subject inside the box.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg bg-muted/40 border border-border touch-none cursor-grab active:cursor-grabbing"
          style={{ aspectRatio: `${CROP_ASPECT}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && renderedStyle && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={renderedStyle}
            />
          )}
          {/* Subtle frame overlay (rule-of-thirds) */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-primary/30" aria-hidden="true">
            <div className="absolute inset-y-0 left-1/3 w-px bg-primary/15" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-primary/15" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-primary/15" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-primary/15" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <ZoomIn className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Slider
            aria-label="Zoom"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={[transform.scale]}
            onValueChange={handleZoomChange}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!img || busy}>
            {busy ? "Saving…" : "Use this framing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
