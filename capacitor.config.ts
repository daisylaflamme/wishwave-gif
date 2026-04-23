import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.5f66f100340b4e2486858eadea090d4c',
  appName: 'gifspark',
  webDir: 'dist',
  // NOTE: `server.url` enables hot-reload from the Lovable sandbox during development.
  // REMOVE this `server` block (or comment it out) before building for production / store submission,
  // otherwise the native app will load the hosted preview instead of the bundled web assets.
  server: {
    url: 'https://5f66f100-340b-4e24-8685-8eadea090d4c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#fdf6f9',
  },
  android: {
    backgroundColor: '#fdf6f9',
  },
};

export default config;
