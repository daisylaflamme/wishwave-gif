# WishWave

WishWave is an AI-powered greeting card app that turns a single photo into a 5-second animated birthday greeting, exported as an animated GIF with an optional message overlay.

## Features

- Upload a photo and pick a motion style (wave, smile, nod)
- AI animates the subject(s) using Runway `gen4_turbo`
- Optional short message burned into the GIF
- Preview and download are the same animated GIF (no audio)
- Session-scoped "Recent Greetings" history

## Tech Stack

### Frontend
- **React 18** + **TypeScript 5** — UI framework
- **Vite 5** — dev server and build tool
- **Tailwind CSS v3** — utility-first styling with semantic HSL design tokens (see `src/index.css` and `tailwind.config.ts`)
- **shadcn/ui** + **Radix UI** — accessible component primitives
- **lucide-react** — icon set
- **React Router** — client-side routing
- **TanStack Query** — server state and caching
- **date-fns** — date formatting

### Backend (Lovable Cloud / Supabase)
- **Postgres** — `generations` table tracks each greeting
- **Storage** — `wishwave-uploads` (source photos) and `wishwave-generated` (rendered videos)
- **Edge Functions** (Deno):
  - `runway-generate` — kicks off a Runway video generation job
  - `runway-poll` — polls Runway for job completion
  - `video-proxy` — CORS-safe proxy for fetching generated videos in the browser

### Media Pipeline
- **Runway gen4_turbo** — image-to-video model (5s, identity-preserving motion)
- **modern-gif** — client-side GIF encoder; frames are captured from the video on a `<canvas>` and the message is burned in via Canvas 2D text rendering
- Output GIF preserves the source image's native dimensions

### Tooling
- **ESLint** — linting
- **Vitest** + **Playwright** — unit and end-to-end tests
- **Bun** — package manager / lockfile

## Project Structure

```
src/
  components/      UI components (ImageUpload, ResultView, GenerationHistory, ...)
  hooks/           useGeneration orchestrates upload → generate → poll → finalize
  lib/             createGif, constants (motion prompts), sessionGenerations
  pages/           Index (wizard) and NotFound
  integrations/    Auto-generated Supabase client and types (do not edit)
supabase/
  functions/       Edge functions (runway-generate, runway-poll, video-proxy)
  migrations/      SQL migrations
```

## Local Development

```sh
bun install
bun run dev
```

## Design System

All colors are defined as HSL CSS variables in `src/index.css` and exposed through Tailwind in `tailwind.config.ts`. Components must use semantic tokens (e.g. `bg-primary`, `text-foreground`, `bg-gradient-soft`) instead of raw color classes.
