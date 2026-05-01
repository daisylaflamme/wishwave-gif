import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const PUBLISHED_ORIGIN = "https://gifspark.lovable.app";
const OAUTH_MESSAGE_ORIGINS = new Set(["https://oauth.lovable.app", "https://lovable.dev"]);
const EXPECTED_MESSAGE_TYPE = "authorization_response";
const POPUP_CHECK_INTERVAL_MS = 500;
const POPUP_TIMEOUT_MS = 120_000;

type ManagedGoogleOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type ManagedGoogleResult =
  | { tokens: { access_token: string; refresh_token: string }; error: null; redirected?: false }
  | { tokens?: undefined; error: Error; redirected?: false }
  | { tokens?: undefined; error: null; redirected: true };

function isLocalDevOrigin() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function generateState() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getPopupFeatures() {
  const width = Math.min(560, Math.max(420, window.outerWidth * 0.5));
  const height = Math.min(720, Math.max(560, window.outerHeight * 0.8));
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  return `width=${width},height=${height},left=${left},top=${top}`;
}

async function signInWithLocalDevPopup(extraParams?: Record<string, string>): Promise<ManagedGoogleResult> {
  const state = generateState();
  const params = new URLSearchParams({
    ...extraParams,
    provider: "google",
    redirect_uri: PUBLISHED_ORIGIN,
    response_mode: "web_message",
    state,
  });
  const popup = window.open(`${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}`, "oauth", getPopupFeatures());

  if (!popup) return { error: new Error("Popup was blocked") };

  return new Promise((resolve) => {
    let settled = false;
    let popupCheckInterval: number | undefined;
    let timeoutId: number | undefined;

    const finish = (result: ManagedGoogleResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      if (popupCheckInterval) window.clearInterval(popupCheckInterval);
      if (timeoutId) window.clearTimeout(timeoutId);
      popup.close();
      resolve(result);
    };

    const onMessage = async (event: MessageEvent) => {
      if (!OAUTH_MESSAGE_ORIGINS.has(event.origin)) return;
      const message = event.data as {
        type?: string;
        response?: {
          state?: string;
          error?: string;
          error_description?: string;
          access_token?: string;
          refresh_token?: string;
        };
      };
      if (message?.type !== EXPECTED_MESSAGE_TYPE) return;

      const response = message.response;
      if (response?.state !== state) return finish({ error: new Error("State is invalid") });
      if (response.error) return finish({ error: new Error(response.error_description ?? response.error) });
      if (!response.access_token || !response.refresh_token) {
        return finish({ error: new Error("No tokens received") });
      }

      try {
        const tokens = { access_token: response.access_token, refresh_token: response.refresh_token };
        await supabase.auth.setSession(tokens);
        finish({ tokens, error: null });
      } catch (error) {
        finish({ error: error instanceof Error ? error : new Error(String(error)) });
      }
    };

    window.addEventListener("message", onMessage);
    popupCheckInterval = window.setInterval(() => {
      if (popup.closed) finish({ error: new Error("Sign in was cancelled") });
    }, POPUP_CHECK_INTERVAL_MS);
    timeoutId = window.setTimeout(() => finish({ error: new Error("OAuth timed out waiting for response") }), POPUP_TIMEOUT_MS);
  });
}

export async function signInWithManagedGoogle(options: ManagedGoogleOptions = {}): Promise<ManagedGoogleResult> {
  if (isLocalDevOrigin()) {
    return signInWithLocalDevPopup(options.extraParams);
  }

  return lovable.auth.signInWithOAuth("google", {
    redirect_uri: options.redirect_uri ?? window.location.origin,
    extraParams: options.extraParams,
  });
}