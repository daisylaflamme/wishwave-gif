// Helpers for cropping/repositioning an uploaded image to a fixed aspect ratio
// (16:9, matching Runway's 1280×720 output). Pure functions — no React.

export const CROP_TARGET_WIDTH = 1280;
export const CROP_TARGET_HEIGHT = 720;
export const CROP_ASPECT = CROP_TARGET_WIDTH / CROP_TARGET_HEIGHT;

export interface CropTransform {
  /** Multiplier applied to the "cover" base scale. >= 1 (1 = fully fit, no empty edges). */
  scale: number;
  /** Image translation in viewport pixels relative to centered position. */
  offsetX: number;
  offsetY: number;
}

export const IDENTITY_TRANSFORM: CropTransform = { scale: 1, offsetX: 0, offsetY: 0 };

/** Load a File into an HTMLImageElement (decoded). */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Keep URL alive until caller revokes; revoke once the image has decoded into memory.
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Compute the "cover" base scale that makes the image fully cover the 16:9 viewport
 * of the given pixel size, then multiply by `scale`.
 */
export function computeCoverScale(
  imgW: number,
  imgH: number,
  viewportW: number,
  viewportH: number,
): number {
  return Math.max(viewportW / imgW, viewportH / imgH);
}

/**
 * Clamp pan offset so the (scaled) image always covers the viewport — no empty edges.
 */
export function clampOffset(
  imgW: number,
  imgH: number,
  viewportW: number,
  viewportH: number,
  scaleMultiplier: number,
  offsetX: number,
  offsetY: number,
): { offsetX: number; offsetY: number } {
  const base = computeCoverScale(imgW, imgH, viewportW, viewportH);
  const finalScale = base * scaleMultiplier;
  const renderedW = imgW * finalScale;
  const renderedH = imgH * finalScale;
  const maxX = Math.max(0, (renderedW - viewportW) / 2);
  const maxY = Math.max(0, (renderedH - viewportH) / 2);
  return {
    offsetX: Math.max(-maxX, Math.min(maxX, offsetX)),
    offsetY: Math.max(-maxY, Math.min(maxY, offsetY)),
  };
}

/**
 * Render the current viewport crop to a 1280×720 JPEG File.
 */
export async function renderCrop(
  img: HTMLImageElement,
  viewportW: number,
  viewportH: number,
  transform: CropTransform,
  originalName: string,
): Promise<File> {
  const base = computeCoverScale(img.naturalWidth, img.naturalHeight, viewportW, viewportH);
  const finalScale = base * transform.scale;
  const renderedW = img.naturalWidth * finalScale;
  const renderedH = img.naturalHeight * finalScale;

  // The viewport's top-left in "rendered image" coordinates.
  const viewLeft = (renderedW - viewportW) / 2 - transform.offsetX;
  const viewTop = (renderedH - viewportH) / 2 - transform.offsetY;

  // Convert to source-image pixel coordinates.
  const sx = viewLeft / finalScale;
  const sy = viewTop / finalScale;
  const sw = viewportW / finalScale;
  const sh = viewportH / finalScale;

  const canvas = document.createElement("canvas");
  canvas.width = CROP_TARGET_WIDTH;
  canvas.height = CROP_TARGET_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CROP_TARGET_WIDTH, CROP_TARGET_HEIGHT);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      "image/jpeg",
      0.92,
    );
  });

  const baseName = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg" });
}
