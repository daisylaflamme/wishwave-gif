
# Media Export Refactor — MP4 Primary, WebP Secondary, GIF Optional

Reuse the single Runway MP4 (already persisted in Supabase as of last refactor) as the source of truth. Add WebP as a smaller animated alternative. Keep GIF behind an opt-in toggle. No more eager browser GIF encoding on mount — that's the main mobile pain point today.

## 1. Backend (no new edge function for now)

The MP4 is already stored in `wishwave-generated/{userId}/{generationId}.mp4` via `runway-poll`. Nothing changes on the backend in this pass.

**Why no server-side WebP/GIF**: Deno Deploy edge functions can't run native ffmpeg, and we already decided (last round) to defer Cloudinary/etc. Browser-side encoding is fine — it just needs to be **on-demand** (only when the user clicks the button), not automatic on every result view.

## 2. Frontend: new `src/lib/createWebp.ts`

Animated WebP encoder using the existing Canvas+video frame-extraction pipeline (the same approach `createGif.ts` uses), but encoding via the modern `webp-wasm` library or the `WebCodecs` `ImageEncoder` where available.

- **Primary path**: `WebCodecs` (`VideoDecoder` + `ImageEncoder` with `image/webp`) — available on Chrome/Edge/Opera and recent Safari (17+). Hardware-accelerated, fast on mobile.
- **Fallback path**: `webp-wasm` package (~200 KB) — pure WASM encoder, works everywhere. Slower than WebCodecs but still ~3–5× faster than gif.js for the same clip and produces files ~5–10× smaller than GIF.
- Same 512 px max-width downscale, same overlay text rendering as GIF.
- Returns a `Blob` (`image/webp`).
- Progress callback identical to `createGif`.

## 3. Frontend: refactor `ResultView.tsx`

### State
Replace the eager-on-mount `gifBlob` state with three lazy slots:

```ts
type ExportFormat = "mp4" | "webp" | "gif";
const [exporting, setExporting] = useState<ExportFormat | null>(null);
const [exportProgress, setExportProgress] = useState(0);
const [cache, setCache] = useState<Partial<Record<ExportFormat, Blob>>>({});
const [errors, setErrors] = useState<Partial<Record<ExportFormat, string>>>({});
```

Nothing is generated on mount. The MP4 is already a Supabase signed URL — we just play it.

### Preview
Replace the `<img src={gifUrl}>` preview with a `<video>` element looping the MP4:

```tsx
<video
  src={videoUrl}
  autoPlay loop muted playsInline
  poster={...optional first-frame...}
  onLoadedData={() => setVideoReady(true)}
  onError={() => setVideoError(true)}
/>
```

- Loading spinner shown until `onLoadedData`.
- Error state if the video fails (expired link, network).
- No memory-heavy canvas work just to show the result.

### Download buttons (new layout)

```
[ Download MP4 ]   ← primary, solid button, instant (just fetch+save the signed URL)
[ Download Animated WebP ]   ← outline button, lazy-encodes on click with progress
[ ⌄ Download as GIF (compatibility) ]   ← small text link / collapsed under "More options"
```

- **MP4**: fetch the signed URL → blob → save. No encoding. Works on web, native (via `saveToDevice`), and triggers a browser download otherwise. This becomes the default share file too.
- **WebP**: on click, run `createWebp(videoUrl, recipientMessage, onProgress)`. Cache the blob. Show inline progress on the button (`Encoding WebP… 42%`). On failure, show toast "Couldn't create WebP — your MP4 is still ready to download" and keep MP4/GIF buttons usable.
- **GIF**: on click, run existing `createGif(...)`. Same caching + progress + isolated error handling. Failure does not affect MP4 or WebP.

### Share section
Default share file becomes the MP4 (works on iMessage, WhatsApp, X, Discord, Instagram DM). Helper text updated:

> "MP4 works everywhere. Download WebP for smaller file size, or GIF for legacy compatibility (forums, old chat apps)."

The Instagram button switches to "Save MP4, then post to Instagram" (Instagram supports MP4 natively as a Reel/Story — this is actually better than a GIF, which it doesn't accept directly).

### File naming
- `gifspark-{label}.mp4`
- `gifspark-{label}.webp`
- `gifspark-{label}.gif`

## 4. Performance & memory wins

- **No work on mount** — opening a result no longer kicks off a 50-frame canvas loop. Mobile result page becomes instant.
- **MP4 download is zero-encode** — fetch signed URL, save. ~1 second on mobile vs the current 10–30 s GIF encode.
- **WebP via WebCodecs** uses hardware decode/encode where available, way lighter on RAM than gif.js.
- **GIF only runs if explicitly requested** — most users will pick MP4 or WebP and never trigger gif.js.
- Each encoder is dynamically imported (`await import(...)`) so the heavy WASM only loads when its button is clicked. Initial JS bundle shrinks.

## 5. Error handling matrix

| Failure | User-visible behavior | Other downloads still work? |
|---|---|---|
| MP4 fetch fails | Toast "Couldn't download — link may have expired" + retry | WebP/GIF unaffected (encode from cached video element if possible, else also fail gracefully) |
| WebP encode fails | Inline error under WebP button + toast | MP4 + GIF unaffected |
| GIF encode fails | Inline error under GIF button + toast | MP4 + WebP unaffected |
| Video preview fails to load | Error card in preview slot, all three download buttons disabled with explanation | — |

All errors logged to console for debugging. Friendly copy in the UI.

## 6. Cleanup

- `useGeneration.ts`: no changes (it already returns `videoUrl` only).
- `createGif.ts`: stays as-is — it's now lazy-loaded.
- Tests: existing example test untouched.

## 7. Files touched

**New**
- `src/lib/createWebp.ts` — WebCodecs primary, webp-wasm fallback, same API shape as `createGif`.

**Edited**
- `src/components/ResultView.tsx` — full restructure: lazy encoding, MP4-first, three download buttons, video preview, isolated error states.
- `package.json` — add `@jsquash/webp` (or `webp-wasm`) as the WebP fallback encoder.

**Unchanged but related**
- `src/lib/createGif.ts` — kept for the optional GIF button.
- `supabase/functions/runway-poll/index.ts` — already stores MP4 in Supabase; no change.

## 8. Mobile-specific notes

- `<video playsInline muted autoPlay loop>` is the iOS-safe pattern — confirmed.
- WebCodecs is supported on iOS Safari 17+; older iOS falls through to `@jsquash/webp` WASM (still way lighter than gif.js).
- On Capacitor native, `Share.share({ files: [mp4Uri] })` works natively for MP4 — better UX than the current GIF-share flow.

## 9. Out of scope (explicit)

- No server-side WebP/GIF encoding (decided last round — re-evaluate later with Cloudinary if mobile encoding is still slow).
- No changes to Stripe, motion selection, upload flow, history grid, or auth.
- No design system changes — same buttons, same brand colors, same layout shell.

