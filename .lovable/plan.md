

## Plan: GIF-only Preview and Download

Since we're pivoting to GIF output, the preview should match the download exactly — no audio, no separate video player. The preview and download will both use the same generated GIF with the message burned in.

### Changes

**1. Create `src/lib/createGif.ts`**
- New module using `gif.js` library
- Loads video via the existing video-proxy (for CORS)
- Plays video on a hidden `<canvas>`, captures frames at ~10 FPS for 5 seconds
- Draws the greeting text overlay on each frame using Canvas 2D text rendering
- Scales output to ~480px width for reasonable file size
- Returns a `Blob` of the animated GIF

**2. Rewrite `src/components/ResultView.tsx`**
- Remove all audio references (`audioRef`, `<audio>` element, audio sync logic)
- Remove the `audioUrl` prop
- On mount (or when videoUrl changes), automatically generate the GIF using `createGif`
- Show a loading state while GIF is being generated ("Creating your greeting...")
- Once ready, display the GIF as a simple `<img>` tag with the message overlay already burned in
- No play/pause controls needed — GIF auto-loops
- Download button saves the same GIF blob as `.gif`
- Update button label to "Download GIF"

**3. Update parent component(s)**
- Remove `audioUrl` prop passed to `ResultView` (find where it's used)
- Clean up any audio-related state that's no longer needed

**4. Install `gif.js` dependency**
- Add `gif.js` and `@types/gif.js` packages

**5. Cleanup (optional)**
- Remove `src/lib/mergeVideoAudio.ts` (no longer needed)
- Remove FFmpeg-related dependencies and local assets if no longer used elsewhere

### Result
- Preview shows the animated GIF with message burned in — exactly what gets downloaded
- No audio anywhere — consistent experience
- No FFmpeg dependency — much more reliable

