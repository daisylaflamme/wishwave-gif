
## Goal

Get GifSpark ready for an actual native iOS/Android build with:

1. **App icons + splash screen + permission strings** — required by both stores and by Capacitor.
2. **Native Google sign-in that returns cleanly to the app.**
3. **A "Buy credits" entry point on native** that opens Safari to the web app (since you've chosen not to do in-app purchases).

This plan covers in-codebase changes only. Steps that must be run on your Mac (`npx cap add`, Xcode signing, etc.) are listed at the end as "what you do locally."

---

## 1. App icons + splash screen

### Tooling
Add `@capacitor/assets` as a dev dependency. It generates every iOS and Android icon/splash size from a single source image.

### Files you provide
You'll need to upload two source images (I'll prompt you when we start):
- `resources/icon.png` — 1024×1024, opaque, no transparency, no rounded corners (Apple adds them).
- `resources/splash.png` — 2732×2732, your logo centered on the brand bg `#fdf6f9`.

Optionally a dark-mode splash: `resources/splash-dark.png`.

### Generated outputs
Running `npx capacitor-assets generate` writes into `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`. These are committed to the repo.

### Capacitor config additions
Add a `SplashScreen` plugin block to `capacitor.config.ts`:

```ts
plugins: {
  SplashScreen: {
    launchShowDuration: 1500,
    backgroundColor: "#fdf6f9",
    showSpinner: false,
    androidScaleType: "CENTER_CROP",
    splashFullScreen: true,
    splashImmersive: false,
  },
}
```

Install `@capacitor/splash-screen` so the plugin is wired.

---

## 2. Permission strings

### iOS — `ios/App/App/Info.plist`
Required because the app uses the photo picker:

- `NSPhotoLibraryUsageDescription` — "GifSpark needs access to your photos so you can pick a portrait to animate."
- `NSPhotoLibraryAddUsageDescription` — "GifSpark saves your generated animated photos to your library."
- `NSCameraUsageDescription` — "Take a portrait directly in the app to animate it." (only if we add camera capture; safe to include)

### Android — `android/app/src/main/AndroidManifest.xml`
- `READ_MEDIA_IMAGES` (Android 13+)
- `READ_EXTERNAL_STORAGE` (older Android, with `android:maxSdkVersion="32"`)
- `WRITE_EXTERNAL_STORAGE` only if needed for legacy save-to-device

### Code change
The `Info.plist` and `AndroidManifest.xml` files only exist after you run `npx cap add ios` / `npx cap add android` locally. I'll provide a snippet you paste in, or — if you commit the native projects to the repo after `cap add` — I can edit them directly in the next iteration.

---

## 3. Fix Google OAuth on native

### The problem
Currently `Auth.tsx` calls:
```ts
lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })
```

On a real native build (no Lovable sandbox URL), `window.location.origin` resolves to `capacitor://localhost` (iOS) or `http://localhost` (Android). Google won't redirect back there, and even if it did, the in-app webview doesn't hand the session back to the WKWebView running the app.

### The fix — use `@capacitor/browser` + a custom URL scheme

**a. Register a custom URL scheme** so the OS reopens the app on the OAuth callback:
- `appId` is `app.lovable.5f66f100340b4e2486858eadea090d4c` → use scheme `gifspark://auth/callback`.
- iOS: add `CFBundleURLTypes` entry to `Info.plist`.
- Android: add an `<intent-filter>` with `<data android:scheme="gifspark" android:host="auth" />` to `MainActivity` in `AndroidManifest.xml`.

**b. Allowlist the redirect URI** in Lovable Cloud Auth settings so `gifspark://auth/callback` is accepted as a valid redirect.

**c. Update `src/pages/Auth.tsx`** to branch by platform:

```ts
import { isNativeApp } from "@/lib/platform";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";

const handleGoogle = async () => {
  if (isNativeApp()) {
    const redirectUri = "gifspark://auth/callback";
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri,
      // ask the SDK to give us the URL instead of redirecting the in-app webview
      skipBrowserRedirect: true,
    });
    if (result?.url) {
      // open in the system browser (SFSafariViewController / Chrome Custom Tabs)
      await Browser.open({ url: result.url });
    }
  } else {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
  }
};
```

**d. Handle the deep-link return** in `src/App.tsx`'s `NativeShell`:

```ts
const sub = await CapApp.addListener("appUrlOpen", async ({ url }) => {
  if (url.startsWith("gifspark://auth/callback")) {
    await Browser.close();
    // Lovable auth SDK exchange: parse the code/hash and complete sign-in.
    await lovable.auth.handleOAuthCallback(url);
    navigate("/", { replace: true });
  }
});
```

(If `lovable.auth` doesn't expose a callback handler, we fall back to forwarding the URL into a hidden iframe with the same query/hash so the existing onAuthStateChange listener picks up the session — I'll verify the SDK surface during implementation.)

**e. Install plugins**
- `@capacitor/browser`
- `@capacitor/app` (already present from `NativeShell`)

---

## 4. "Buy credits" deep link to web (since no native IAP)

Native users currently see no path to top up. We'll give them one that's App-Store-safe by sending them to your existing web checkout via Safari.

### `src/components/CreditsBadge.tsx`
Show a "Buy more" button on native too, but on tap:
- open `https://gifspark.lovable.app/?buy=1` in `Browser.open()` via `openExternal()` from `platform.ts`.
- include the user's email as a `?email=` hint so the web checkout can prefill.

### `src/pages/Index.tsx`
The auto-open paywall guard currently checks `!native`. Keep that — we never auto-pop the modal on native. The badge tap is an explicit user choice, which Apple allows as an external link.

### Apple-safety language
Per App Store rules, you **cannot** say things like "Buy credits cheaper on the web" or include a price. The button label and any sheet copy must be neutral, e.g.:

- Button: **"Manage credits"**
- Tooltip / confirmation sheet: "Continue to gifspark.com to manage your account."

We'll add a small confirmation sheet (using shadcn `Drawer` on mobile) before opening the external link, which is now required by Apple's "External Link Account Entitlement" guidance even though we're not under that entitlement — being explicit avoids reviewer confusion.

---

## 5. Misc cleanup discovered during exploration

- `capacitor.config.ts` still has `server.url` pointing at the Lovable sandbox. I'll add a clear comment + a `// PRODUCTION: remove this block` reminder, and (optionally) read it from `process.env.CAP_SERVER_URL` so dev vs. prod is a single env flip rather than a hand-edit.
- `CreditsBadge` says "GIFs left" but the product is "animated photos". Rename to "credits left" for consistency with the rest of the UI.

---

## What I'll do in code (next loop)

1. `bun add @capacitor/browser @capacitor/splash-screen`
2. `bun add -D @capacitor/assets`
3. Update `capacitor.config.ts` (SplashScreen plugin, env-driven server URL, comments).
4. Update `src/pages/Auth.tsx` with the native OAuth branch.
5. Update `src/App.tsx` `NativeShell` with `appUrlOpen` listener.
6. Update `src/components/CreditsBadge.tsx` with the native "Manage credits" path.
7. Add a small confirmation sheet for the external-link tap.
8. Write `docs/native-setup.md` with the exact `Info.plist` / `AndroidManifest.xml` snippets you paste after `npx cap add`.

## What you do locally afterwards

1. Upload `resources/icon.png` (1024²) and `resources/splash.png` (2732²).
2. `git pull`, `npm install`, `npx cap add ios` / `npx cap add android`.
3. `npx capacitor-assets generate` to produce all icon/splash sizes.
4. Paste the `Info.plist` + `AndroidManifest.xml` snippets from `docs/native-setup.md`.
5. In Lovable Cloud → Auth → Google: add `gifspark://auth/callback` to the allowed redirect URIs.
6. `npm run build && npx cap sync && npx cap run ios` (or android).

After this works, the natural follow-ups are: Apple Sign In (required by App Store if you keep Google sign-in), TestFlight setup, store listing assets (screenshots, description, privacy nutrition labels). Those are a separate plan.
