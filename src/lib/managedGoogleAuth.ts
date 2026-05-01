import { lovable } from "@/integrations/lovable/index";

type ManagedGoogleOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

const PREVIEW_URL = "https://id-preview--5f66f100-340b-4e24-8685-8eadea090d4c.lovable.app";

export function isLocalDevOrigin() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export async function signInWithManagedGoogle(options: ManagedGoogleOptions = {}) {
  if (isLocalDevOrigin()) {
    return {
      error: new Error(
        `Google sign-in only works on the deployed app. Please test it on ${PREVIEW_URL}`
      ),
    } as const;
  }

  return lovable.auth.signInWithOAuth("google", {
    redirect_uri: options.redirect_uri ?? window.location.origin,
    extraParams: options.extraParams,
  });
}
