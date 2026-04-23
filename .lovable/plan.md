

# GifSpark — Mobile App Wrapper Prep (Capacitor)

Prepare GifSpark to be wrapped as a native iOS + Android app using Capacitor, with payments fully removed from the mobile experience.

## 1. Add a mobile-mode flag

A single source of truth for "am I running inside the mobile app?" so the web build is unaffected.

- Detect Capacitor at runtime via `window.Capacitor?.isNativePlatform?.()`.
- Expose `isNativeApp()` from `src/lib/platform.ts`.
- Web build: behaves exactly as today (payments visible).
- Mobile build: payments hidden, native integrations enabled.

## 2. Remove payment surfaces in mobile mode

In native mode, hide every checkout entry point and replace with a soft "Manage on web" link.

| Surface | Web | Mobile |
|---|---|---|
| `CreditsBadge` "Buy more" button | shown | hidden — badge still shows credit count |
| `Header` `onBuyCredits` prop | wired | not passed |
| `Index.tsx` "You're out of credits" CTA | "Buy GIF credits" button | "Buy credits at gifspark.app" link (opens in external browser via `Browser.open`) |
| `PricingModal` mount | mounted | not mounted, lazy import skipped |
| `PurchaseHistory` component | shown | hidden |
| `PaymentTestModeBanner` | shown | hidden |
| Routes `/payment-success` | active | redirects to `/` |

`PricingModal.tsx`, Stripe libs, and edge functions stay in the codebase — just unreached on mobile. No business logic deletion.

## 3. Native shell config

New files for the Capacitor wrapper (user runs `npx cap add ios/android` themselves after pulling to GitHub).

- **`capacitor.config.ts`** at project root:
  - `appId: app.lovable.5f66f100340b4e2486858eadea090d4c`
  - `appName: gifspark`
  - `webDir: dist`
  - `server.url` pointing at the Lovable preview for hot-reload during dev (commented note: remove for production builds)
  - `ios.contentInset: 'always'`, `backgroundColor` matching brand
- **Plugins to install** (declared in package.json, user installs after pulling):
  - `@capacitor/core`, `@capacitor/cli`
  - `@capacitor/ios`, `@capacitor/android`
  - `@capacitor/share` — native share sheet
  - `@capacitor/filesystem` — save GIF to device
  - `@capacitor/browser` — open external links (purchase page, legal links)
  - `@capacitor/app` — back-button handling, deep links
  - `@capacitor/status-bar` + `@capacitor/splash-screen`

## 4. Mobile UX fixes in the existing app

These ship in both web and mobile builds — they're improvements, not mobile-only.

### Safe-area & viewport (`index.html` + `index.css`)
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />`
- Add `safe-area-inset-*` utilities; apply `pt-safe`/`pb-safe` to `Header` top bar and `SupportChatButton` floating position.
- Lock `body` against rubber-band overscroll on iOS: `overscroll-behavior-y: none`.
- Disable text selection on UI chrome (`user-select: none` on buttons/headers); keep it on inputs and the result message.

### Touch targets & states
- Audit all `<button>` and icon buttons for min 44×44 hit area (the `Header` sign-out icon, `ResultView` share icons, `ImageUpload` clear `X`).
- Replace any `hover:`-only feedback with `active:` equivalents on touch devices via `@media (hover: none)`.
- Add `touch-action: manipulation` to all buttons to kill the 300ms double-tap delay.

### Upload flow on mobile
- `ImageUpload`: replace the dynamic `<input>` creation with a persistent hidden `<input type="file" accept="image/*" capture="environment">` so iOS shows the proper "Photo Library / Take Photo" sheet.
- Validate file size (10 MB cap) with a clear toast — mobile photos are huge.
- Add an explicit "Take Photo" path on native using `@capacitor/camera` (graceful fallback to file input).

### Result/share flow on mobile
- `ResultView`: route share through Capacitor `Share.share({ files: [...] })` when `isNativeApp()`, falling back to existing `navigator.share`/popup logic on web.
- "Download GIF" on native: write blob via `Filesystem.writeFile` to `Documents/`, then surface a toast "Saved to Files" with a "Share" button. Web behavior unchanged.
- WhatsApp/Facebook/X/Email buttons: open via `Browser.open` on native (avoids broken `window.open` popups in WebView).

### Modals & scrolling
- `PricingModal`/`SignInDialog`/`SupportChatPanel`: ensure `max-h-[90vh]` accounts for safe-area; switch to `Drawer` on small screens (already partially done for sheets — audit and confirm).
- Set `-webkit-overflow-scrolling: touch` on all scroll areas.

### Loading/error/empty states pass
- Confirm `ProgressOverlay` covers the full safe area.
- `GenerationHistory` empty state copy + skeleton.
- Network error toasts with retry buttons in `useGeneration`.

## 5. Routing & external links

- Wrap the router so back-button on Android calls `App.exitApp()` only when on `/` (use `@capacitor/app` listener).
- All `<a target="_blank">` (Footer "Powered by Runway", Legal external links): intercept on native and route through `Browser.open()`.
- `/auth` and `/payment-success`: on native, `/payment-success` redirects to `/`; `/auth` is allowed (sign-in still works in-app).

## 6. OAuth on native

Google sign-in via Supabase needs a deep-link callback on native:
- Add `redirectTo: nativeRedirect` in `useAuth.signInWithOAuth` — `app.lovable.5f66f100340b4e2486858eadea090d4c://auth-callback` on native, normal URL on web.
- Listen for `appUrlOpen` and forward to Supabase `getSessionFromUrl`.
- Document in README that user must add this URL scheme to Supabase Auth → URL Configuration → Redirect URLs.

## 7. Files touched

**New**
- `src/lib/platform.ts` — `isNativeApp()`, `openExternal()`, `nativeShare()`, `saveToDevice()`
- `capacitor.config.ts`
- Memory file `mem://technical/mobile-wrapper`

**Edited**
- `index.html` — viewport-fit=cover, mobile meta tags
- `src/index.css` — safe-area utilities, touch optimizations, hover-media guards
- `src/App.tsx` — guard `/payment-success` route on native; back-button handler
- `src/pages/Index.tsx` — hide pricing + purchase history on native; replace out-of-credits CTA
- `src/components/Header.tsx` — conditional `onBuyCredits`, safe-area padding
- `src/components/CreditsBadge.tsx` — hide "Buy more" on native
- `src/components/PaymentTestModeBanner.tsx` — return null on native
- `src/components/ImageUpload.tsx` — persistent file input, size validation, capture attr
- `src/components/ResultView.tsx` — native share + filesystem save paths
- `src/components/Footer.tsx` — external links via `openExternal`
- `src/components/support/SupportChatButton.tsx` — safe-area-aware positioning
- `src/hooks/useAuth.tsx` — native OAuth redirect handling
- `package.json` — Capacitor deps

## 8. Mobile QA checklist (delivered with the work)

A printable checklist in chat covering: launch, sign-in (email + Google), sign-out, upload from library, upload via camera, preview persistence on back-nav, motion select, generate, retry on failure, preview, native share, save to Files, copy link, delete from history, no payment UI visible, external links open in system browser, safe-area on iPhone notch + Android gesture bar, landscape on tablet, no clipped modals, no hover-stuck buttons.

## 9. Next steps after this work (handed to you)

1. Click "Export to GitHub" in Lovable, then `git clone` your repo locally.
2. `npm install`
3. `npx cap add ios` and/or `npx cap add android`
4. `npm run build && npx cap sync`
5. iOS: `npx cap open ios` → run in Xcode on simulator/device. Requires Mac + Xcode 15+, an Apple Developer account ($99/yr) for App Store submission.
6. Android: `npx cap open android` → run in Android Studio. Requires a Google Play Developer account ($25 one-time) for Play Store submission.
7. In Supabase dashboard → Auth → URL Configuration: add `app.lovable.5f66f100340b4e2486858eadea090d4c://auth-callback` to redirect URLs.
8. Before submission: create app icons + splash screens (`@capacitor/assets`), write store listing copy, capture screenshots, complete iOS privacy labels (camera, photo library) and Android permissions disclosure.
9. Re-run `npx cap sync` after every Lovable pull.

## 10. Remaining risks

- **ffmpeg.wasm in WebView**: GIF encoding loads ~30 MB of WASM; needs testing on low-end Android. Fallback plan: server-side encoding if perf is bad.
- **iOS WebView memory**: large photos + ffmpeg may crash on older iPhones. Mitigation: 10 MB upload cap + downscale before encoding.
- **App Store payment policy**: even with all checkout removed, Apple may flag external "Buy on website" links under Reader app rules. Acceptable approach: keep the link generic ("Manage account on gifspark.app") without "Buy" wording if rejected.
- **Hot-reload via `server.url`** must be removed from `capacitor.config.ts` before production builds, otherwise the app will load from the Lovable preview instead of bundled assets.

