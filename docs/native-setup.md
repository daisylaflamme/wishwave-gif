# Native Setup Guide (iOS + Android)

This is the one-time, on-your-Mac/PC setup needed after pulling the repo to ship a real native build to the App Store / Play Store.

> Anything in this guide must be done **outside** Lovable, on your local machine, because it edits files inside `ios/` and `android/` (which only exist after `npx cap add`).

---

## 1. Initial sync

```bash
npm install
npx cap add ios       # macOS only — needs Xcode
npx cap add android   # needs Android Studio
npm run build
npx cap sync
```

For dev builds with hot-reload from the Lovable sandbox:

```bash
CAP_SERVER_URL="https://5f66f100-340b-4e24-8685-8eadea090d4c.lovableproject.com?forceHideBadge=true" npx cap sync
```

For production builds, leave `CAP_SERVER_URL` unset.

---

## 2. App icons + splash screen

1. Place two source images in `resources/`:
   - `resources/icon.png` — **1024×1024**, opaque (no transparency, no rounded corners).
   - `resources/splash.png` — **2732×2732**, logo centered on `#fdf6f9` background.
2. Generate every required size:
   ```bash
   npx capacitor-assets generate
   ```
3. Commit the generated files inside `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`.

---

## 3. iOS — `Info.plist`

Open `ios/App/App/Info.plist` and add the following keys inside the top-level `<dict>`.

### Photo / camera permission strings

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>GifSpark needs access to your photos so you can pick a portrait to animate.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>GifSpark saves your generated animated photos to your library.</string>
<key>NSCameraUsageDescription</key>
<string>Take a portrait directly in the app to animate it.</string>
```

### Custom URL scheme (for Google sign-in deep link)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>app.lovable.5f66f100340b4e2486858eadea090d4c</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>gifspark</string>
    </array>
  </dict>
</array>
```

---

## 4. Android — `AndroidManifest.xml`

Open `android/app/src/main/AndroidManifest.xml`.

### Permissions (inside `<manifest>`, above `<application>`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

### Custom URL scheme (inside the main `<activity android:name=".MainActivity">`)

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="gifspark" android:host="auth" />
</intent-filter>
```

---

## 5. Lovable Cloud — allowlist the redirect URI

Currently the Lovable Cloud OAuth allowlist accepts your Lovable / custom domains automatically. The native flow uses a different bridge:

- The native app opens `https://gifspark.lovable.app/auth?native=1` in the system browser.
- That web page completes Google sign-in normally (using your already-allowlisted web origin).
- Once signed in, the page emits a `gifspark://auth/callback#access_token=…&refresh_token=…` URL.
- The OS opens the native app via the custom scheme; the app calls `supabase.auth.setSession(...)` and you're signed in.

**No extra OAuth allowlist entry is required** for `gifspark://`, because the OAuth provider only ever sees the web origin — the custom scheme is purely internal handoff between the browser tab and the app.

---

## 6. Building for production

```bash
# unset any dev server URL first
unset CAP_SERVER_URL

npm run build
npx cap sync
npx cap open ios       # → archive in Xcode → upload to App Store Connect
npx cap open android   # → generate signed AAB in Android Studio
```

---

## 7. Reminders before App Store submission

- **Apple Sign In** is required if you offer Google sign-in. Add it via Lovable Cloud → Auth → Apple before submitting.
- **Privacy nutrition labels** in App Store Connect: declare email + photos.
- **Privacy policy URL**: `/legal` is already in the app — point Apple at the published version.
- The "Manage" button in the credits badge intentionally uses neutral language and sends users to the website — do **not** mention pricing on the native UI; Apple rejects apps that steer users to external purchases with promotional language.
