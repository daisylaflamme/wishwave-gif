import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ImageIcon, X, ArrowRight, Video, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadCache } from "@/lib/uploadCache";
import { toast } from "sonner";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
  onAdjust?: () => void;
  onRequireAuth?: () => boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function ImageUpload({ onImageSelect, selectedImage, onClear, onAdjust, onRequireAuth }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(() => uploadCache.get().preview);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore preview after navigation (e.g., user clicked Learn more then came back).
  useEffect(() => {
    if (selectedImage && !preview) {
      const cached = uploadCache.get();
      if (cached.preview && cached.file === selectedImage) {
        setPreview(cached.preview);
      } else {
        const url = URL.createObjectURL(selectedImage);
        setPreview(url);
        uploadCache.set(selectedImage, url);
      }
    }
    if (!selectedImage && preview) {
      setPreview(null);
    }
  }, [selectedImage, preview]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, HEIC, etc.).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image is too large", {
        description: "Please choose a photo under 10 MB.",
      });
      return;
    }
    onImageSelect(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    uploadCache.set(file, url);
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (onRequireAuth && !onRequireAuth()) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile, onRequireAuth]);

  const handleClear = () => {
    onClear();
    uploadCache.clear();
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const triggerPicker = () => {
    if (onRequireAuth && !onRequireAuth()) return;
    inputRef.current?.click();
  };

  if (selectedImage && preview) {
    return (
      <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 max-w-sm mx-auto">
        <img src={preview} alt="Selected" className="w-full h-64 object-cover" />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-11 w-11 rounded-full"
          onClick={handleClear}
          aria-label="Remove photo"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Persistent hidden input — works reliably inside iOS WebView and triggers
          the proper "Photo Library / Take Photo" sheet on mobile. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={triggerPicker}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); triggerPicker(); } }}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer min-h-[44px] ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50 active:bg-muted/60"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {dragOver ? (
              <Upload className="h-8 w-8 text-primary animate-bounce" />
            ) : (
              <ImageIcon className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              Drag & drop your photo or click to upload
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Best results: clear, front-facing photo
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-medium tracking-wide flex items-center justify-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Photo</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Video className="h-3.5 w-3.5" aria-hidden="true" />
              <span>GIF animation</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
