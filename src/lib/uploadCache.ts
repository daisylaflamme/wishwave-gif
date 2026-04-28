// In-memory cache that survives client-side route changes (component unmounts)
// so the user doesn't lose their uploaded photo when visiting /legal etc.
// Cleared on full page reload — that's intentional.

import type { CropTransform } from "@/lib/imageCrop";

let cachedFile: File | null = null;
let cachedPreview: string | null = null;
let cachedOriginal: File | null = null;
let cachedTransform: CropTransform | null = null;

export const uploadCache = {
  get(): {
    file: File | null;
    preview: string | null;
    original: File | null;
    transform: CropTransform | null;
  } {
    return {
      file: cachedFile,
      preview: cachedPreview,
      original: cachedOriginal,
      transform: cachedTransform,
    };
  },
  set(file: File | null, preview: string | null) {
    if (cachedPreview && cachedPreview !== preview) {
      try { URL.revokeObjectURL(cachedPreview); } catch { /* noop */ }
    }
    cachedFile = file;
    cachedPreview = preview;
  },
  setOriginal(original: File | null, transform: CropTransform | null) {
    cachedOriginal = original;
    cachedTransform = transform;
  },
  clear() {
    if (cachedPreview) {
      try { URL.revokeObjectURL(cachedPreview); } catch { /* noop */ }
    }
    cachedFile = null;
    cachedPreview = null;
    cachedOriginal = null;
    cachedTransform = null;
  },
};
