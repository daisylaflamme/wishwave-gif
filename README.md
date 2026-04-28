# GifSpark

GifSpark is an AI-powered greeting app that turns a single photo into a 5-second animated reaction (wave, smile, dance, and more), exported as an animated WebP, GIF, or MP4 — with an optional message overlay.

## Features

- Upload a photo (with in-browser cropping / repositioning) and pick a motion style
- AI animates the subject(s) using Runway `gen4_turbo`
- Optional short message burned into the animated WebP / GIF
- Primary download as animated **WebP**, secondary **GIF**, plus **MP4** under "More format options" (MP4 has no message overlay)
- Session-scoped "Recent Greetings" history
- Credits system with Stripe checkout, purchase history, and an in-app support chat
- Native iOS / Android builds via Capacitor (payments are hidden in native builds)

## Tech Stack

### Frontend
- **React 18** + **TypeScript 5** — UI framework
- **Vite 5** (with `@vitejs/plugin-react-swc`) — dev server and build tool
- **Tailwind CSS v3** — utility-first styling with semantic HSL design tokens (`src/index.css`, `tailwind.config.ts`), plus `tailwindcss-animate` and `@tailwindcss/typography`
- **shadcn/ui** + **Radix UI** primitives — accessible component library
- **lucide-react** — icon set
- **React Router** — client-side routing
- **TanStack Query** — server state and caching
- **React Hook Form** + **Zod** (`@hookform/resolvers`) — forms and validation
- **date-fns** — date formatting
- **sonner** + Radix Toast — notifications
- **next-themes** — theme handling
- **embla-carousel-react**, **vaul**, **cmdk**, **input-otp**, **react-day-picker**, **react-resizable-panels**, **recharts** — shadcn/ui supporting libraries
- **react-markdown** — markdown rendering (support chat)

### Media Pipeline
- **Runway gen4_turbo** — image-to-video model (5s, identity-preserving motion)
- **HTML5 `<canvas>`** — frame capture from the generated video and message text overlay
- **`@jsquash/webp`** — animated WebP encoding (primary export)
- **modern-gif** — animated GIF encoding (secondary export)
- **MP4** — raw Runway output served as a download (no overlay)

### Backend (Lovable Cloud / Supabase)
- **Postgres** — `generations` table tracks each greeting (scoped per `user_id`) with Row Level Security
- **Storage** — `wishwave-uploads` (source photos, per-user folders) and `wishwave-generated` (rendered videos), both RLS-scoped
- **Edge Functions** (Deno):
  - `runway-generate` — kicks off a Runway video generation job
  - `runway-poll` — polls Runway for job completion
  - `video-proxy` — CORS-safe proxy for fetching generated videos in the browser
  - `create-checkout`, `get-stripe-price`, `payments-webhook` — Stripe credits checkout and webhook handling
  - `support-chat` — AI-powered support chat backed by the Lovable AI Gateway

### Authentication & Authorization
- **Lovable Cloud Auth** (`@lovable.dev/cloud-auth-js`) — managed OAuth broker for social sign-in
- **Google OAuth** — sole sign-in provider
- **Supabase Auth** (`@supabase/supabase-js`) — JWT session storage, `onAuthStateChange` listener, and `getUser()` token verification inside Edge Functions
- **React Context** — `AuthProvider` + `useAuth` hook expose session/user state app-wide
- **Guest-friendly gating** — home page is public; a `SignInDialog` prompts Google sign-in on the first authenticated action
- **Row Level Security (RLS)** — Postgres policies restrict `generations` rows and storage objects to the owning `user_id`
- **Edge Function authorization** — every call validates the caller's bearer token, verifies storage paths are scoped to `wishwave-uploads/<user_id>/`, and confirms `generationId` ownership before mutating

### Payments
- **Stripe** (`@stripe/stripe-js`, `@stripe/react-stripe-js`) — credit pack checkout, webhook-driven credit grants, and purchase history
- Payment surfaces are automatically hidden in Capacitor (native) builds

### Mobile (Capacitor 8)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- Plugins: `@capacitor/app`, `@capacitor/browser`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`

### Tooling & Testing
- **ESLint** (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
- **Vitest** + **@testing-library/react** + **jsdom** — unit tests
- **Playwright** — end-to-end tests
- **Bun** — package manager / lockfile
- **lovable-tagger** — dev-mode component tagging

## Project Structure

```
src/
  components/      UI components (ImageUpload, ResultView, GenerationHistory, PricingModal, support/, ui/, ...)
  hooks/           useGeneration, useAuth, useCredits, useSupportChat, ...
  lib/             createWebp, createGif, imageCrop, platform, stripe, sessionGenerations, uploadCache, constants
  pages/           Index (wizard), Auth, Legal, PaymentSuccess, NotFound
  integrations/    Auto-generated Supabase client and types (do not edit)
supabase/
  functions/       runway-generate, runway-poll, video-proxy, create-checkout, get-stripe-price, payments-webhook, support-chat
  migrations/      SQL migrations
capacitor.config.ts  Native iOS / Android configuration
```

## Local Development

```sh
bun install
bun run dev
```

Run tests:

```sh
bun run test          # Vitest
bunx playwright test  # Playwright e2e
```

## Design System

All colors are defined as HSL CSS variables in `src/index.css` and exposed through Tailwind in `tailwind.config.ts`. Components must use semantic tokens (e.g. `bg-primary`, `text-foreground`, `bg-gradient-soft`) instead of raw color classes.
