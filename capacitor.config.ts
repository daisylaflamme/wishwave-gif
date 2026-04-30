import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config.
 *
 * DEVELOPMENT (hot reload from the Lovable sandbox):
 *   Set CAP_SERVER_URL to the sandbox URL before running `npx cap sync`, e.g.
 *     CAP_SERVER_URL=https://5f66f100-340b-4e24-8685-8eadea090d4c.lovableproject.com?forceHideBadge=true npx cap sync
 *
 * PRODUCTION (App Store / Play Store builds):
 *   Leave CAP_SERVER_URL unset. The native app will load the bundled web
 *   assets from `dist/` (built via `npm run build`).
 *
 * Custom URL scheme `gifspark://` is registered in iOS Info.plist and
 * AndroidManifest.xml so OAuth callbacks can deep-link back into the app.
 * See docs/native-setup.md for the exact snippets to paste.
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.lovable.5f66f100340b4e2486858eadea090d4c',
  appName: 'gifspark',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: true,
        },
      }
    : {}),
  ios: {
    contentInset: 'always',
    backgroundColor: '#fdf6f9',
  },
  android: {
    backgroundColor: '#fdf6f9',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#fdf6f9',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
