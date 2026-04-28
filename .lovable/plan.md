
## Goal

Let users reposition and frame their uploaded photo to a 16:9 crop (matching Runway's 1280:720 output) before generation, so subjects aren't cut off unexpectedly.

## Why

Runway generates at fixed `ratio: "1280:720"` (landscape 16:9). Most uploaded portraits are vertical, so faces/hands get auto-cropped without user control. A pre-generation reposition step gives users control over framing.

## UX flow

```text
Upload photo  →  Reposition modal (16:9 crop)  →  Confirm  →  Customize  →  Animate
                 ┌────────────────────────────┐
                 │  [drag image]              │
                 │  [pinch / slider zoom]     │
                 │  [16:9 frame overlay]      │
                 │  [Reset] [Cancel] [Confirm]│
                 └────────────────────────────┘
```

- After a user picks a file, open a **Reposition** modal automatically.
- A fixed 16:9 viewport shows the photo. User can drag to pan and use a zoom slider (mobile: pinch). The crop frame is fixed; the image moves underneath.
- Confirm produces a cropped JPEG (1280×720, fitted with original quality preserved) that becomes the actual `selectedImage` used for generation.
- The thumbnail preview in `ImageUpload` shows the cropped result with an **"Adjust framing"** button to reopen the modal.
- Cancel from the modal on first open clears the upload (back to dropzone). Cancel when re-adjusting keeps the existing crop.

## Components

- **New `src/components/ImageRepositionDialog.tsx`** — Dialog with:
  - 16:9 cropping canvas (CSS aspect-video container, overflow hidden).
  - Original image rendered absolutely; pan via pointer events, zoom via slider (1×–3×).
  - "Reset", "Cancel", "Confirm" buttons.
  - On confirm: render to an offscreen `<canvas>` at 1280×720 → `toBlob('image/jpeg', 0.92)` → return a new `File`.
- **New `src/lib/imageCrop.ts`** — Pure helpers: load image, compute crop rect from pan/zoom, render to canvas, produce File.

## Wiring

- **`src/components/ImageUpload.tsx`**
  - Add an "Adjust framing" button on the thumbnail preview alongside the remove (X) button.
  - Add a new prop `onAdjust?: () => void`.
- **`src/pages/Index.tsx`**
  - State: `originalImage` (raw upload), `selectedImage` (cropped output sent to generation), `repositionOpen`.
  - `handleImageSelect`: store original, open reposition dialog, do not yet set `selectedImage`.
  - On dialog confirm: set `selectedImage` to the cropped `File`, update `uploadCache` preview to the cropped data URL, close dialog.
  - On dialog cancel (first time): clear original. On re-adjust cancel: keep current crop.
  - "Adjust framing" reopens the dialog with `originalImage`.
- **`src/lib/uploadCache.ts`**
  - Extend cache to also hold the original file + original preview, so re-adjustment after navigating to `/legal` still works.

## Technical details

- Crop math: track `scale` (1–3) and `offset {x, y}` in viewport pixels. On confirm, convert to source-image pixel rect and `ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1280, 720)`.
- Output: JPEG at quality 0.92, named `<originalName>-cropped.jpg`. Keeps payload small for upload.
- Pointer handling: `pointerdown/move/up` with capture; clamp offset so image always covers the 16:9 frame (no empty edges).
- Mobile pinch: two-pointer distance ratio updates `scale`.
- Accessibility: dialog has title "Reposition photo", slider has label, all buttons ≥44px.
- No changes to Runway/edge functions — they already expect a single image URL.

## Files

- New: `src/components/ImageRepositionDialog.tsx`
- New: `src/lib/imageCrop.ts`
- Edit: `src/components/ImageUpload.tsx` (Adjust button + prop)
- Edit: `src/pages/Index.tsx` (orchestration, original vs cropped state)
- Edit: `src/lib/uploadCache.ts` (store original alongside cropped)

## Out of scope

- Rotation, filters, or non-16:9 ratios.
- Server-side cropping or changes to Runway parameters.
