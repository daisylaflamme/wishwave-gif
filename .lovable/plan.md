
# WishWave — AI Birthday Greeting Card App

## Overview
A polished web app where users upload a photo, choose motion & audio styles, and get a short animated birthday greeting video with music and text overlay.

## Architecture Summary
- **Frontend**: React + Tailwind, multi-step wizard UI
- **Backend**: Lovable Cloud (Supabase) — Edge Functions for Runway & ElevenLabs API calls, Storage for uploads & generated media
- **ElevenLabs**: Connected via Lovable connector (no manual key needed)
- **Runway**: Manual API key added as a secret
- **Merge**: Browser previews video+audio in sync; client-side ffmpeg.wasm creates downloadable MP4

## API Key Setup
1. **ElevenLabs** — Link via Lovable connector (built-in)
2. **Runway** — User signs up at [runway.ml](https://runway.ml), gets API key, adds as secret `RUNWAY_API_KEY`

## Database & Storage
- **Storage bucket** `wishwave-uploads` (public) — user-uploaded photos
- **Storage bucket** `wishwave-generated` (public) — generated videos & audio
- **Table `generations`** — tracks each run: id, image_url, recipient_name, motion_style, audio_style, status, video_url, audio_url, created_at

## Edge Functions

### 1. `runway-generate` 
- Receives image URL + motion style
- Maps style to curated prompt (wave/smile/nod)
- Calls Runway Gen-3 image-to-video API
- Returns job ID

### 2. `runway-poll`
- Receives job ID
- Checks Runway job status
- Returns status + video URL when complete

### 3. `elevenlabs-audio`
- Generates ~10s of cheerful birthday instrumental or party chime audio via ElevenLabs sound effects/music API
- Returns audio file URL (saved to storage)

## UI Pages & Components

### Page 1: Home / Upload (Step-by-step wizard)
- **Header**: "WishWave" logo + tagline "Turn a photo into a waving birthday wish"
- **Step 1 — Upload**: Drag-and-drop or click-to-upload image area with helper text: "Use a clear, front-facing photo of one person for best results"
- **Step 2 — Customize**: Recipient name input (optional), motion style selector (wave/smile/nod with icons), audio style selector (cheerful instrumental / party chime)
- **Step 3 — Generate**: Big "Create Greeting" button
- Soft gradient background, subtle confetti accents

### Progress Overlay
- Multi-step progress indicator with states: Uploading → Generating motion → Generating audio → Ready
- Animated icons for each step, clean minimal design

### Page 2: Result
- Video player with synced audio playback (HTML5 `<video>` + `<audio>` synced via JS)
- Greeting text overlay rendered on top of video via CSS (centered/lower-third, large readable font, text shadow)
- "Download as MP4" button — uses ffmpeg.wasm to merge video + audio + burn-in text overlay into single file
- "Create Another" button to restart
- Share-friendly layout

### Generation History
- Simple list/grid of past generations below the wizard
- Thumbnail, name, date, re-view option

## Text Overlay Approach
- For **preview**: CSS-positioned text overlay on top of the `<video>` element — large, centered, with text-shadow and safe margins
- For **download**: ffmpeg.wasm burns the text into the video during the merge step using drawtext filter

## Design System
- Warm, celebratory palette: soft pinks, warm oranges, gentle purples
- Rounded corners, soft shadows, gradient backgrounds
- Clean typography (Inter or similar)
- Subtle confetti/sparkle decorative elements
- Polished, product-grade feel — not a demo

## Key UX Details
- All external API calls happen server-side (edge functions)
- Loading states with descriptive progress for each generation phase
- Error handling with friendly retry messages
- Mobile-responsive layout
