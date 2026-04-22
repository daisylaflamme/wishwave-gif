// In-memory cache that survives client-side route changes (component unmounts)
// so the user doesn't lose their uploaded photo when visiting /legal etc.
// Cleared on full page reload — that's intentional.

let cachedFile: File | null = null;
let cachedPreview: string | null = null;

export const uploadCache = {
  get(): { file: File | null; preview: string | null } {
    return { file: cachedFile, preview: cachedPreview };
  },
  set(file: File | null, preview: string | null) {
    // Revoke previous preview URL if replacing
    if (cachedPreview && cachedPreview !== preview) {
      try { URL.revokeObjectURL(cachedPreview); } catch { /* noop */ }
    }
    cachedFile = file;
    cachedPreview = preview;
  },
  clear() {
    if (cachedPreview) {
      try { URL.revokeObjectURL(cachedPreview); } catch { /* noop */ }
    }
    cachedFile = null;
    cachedPreview = null;
  },
};
