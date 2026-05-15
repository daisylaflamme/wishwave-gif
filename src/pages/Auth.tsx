import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isNativeApp } from "@/lib/platform";
import { signInWithManagedGoogle } from "@/lib/managedGoogleAuth";

const NATIVE_CALLBACK_SCHEME = "gifspark://auth/callback";
const WEB_AUTH_URL = "https://gifspark.lovable.app/auth?native=1";

export default function Auth() {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isNativeBridge = searchParams.get("native") === "1";

  useEffect(() => {
    document.title = "Sign in — GifSpark";
  }, []);

  // When loaded as the "native bridge" page in the in-app browser, after the
  // user signs in we forward the tokens back into the native app via a
  // custom URL scheme and then close ourselves.
  useEffect(() => {
    if (!isNativeBridge || !session) return;
    const url = new URL(NATIVE_CALLBACK_SCHEME);
    url.hash = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }).toString();
    window.location.href = url.toString();
  }, [isNativeBridge, session]);

  if (loading) return null;
  // On the native-bridge page, never redirect — we want to stay here so the
  // effect above can hand the session back to the native shell.
  if (session && !isNativeBridge) return <Navigate to="/" replace />;

  const handleGoogle = async () => {
    if (isNativeApp()) {
      // Native: open the web auth page in the system browser. The web page
      // will deep-link back to gifspark://auth/callback once signed in.
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: WEB_AUTH_URL, presentationStyle: "popover" });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Couldn't open sign-in",
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
      return;
    }

    const result = await signInWithManagedGoogle({
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: result.error.message ?? "Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft px-4">
      <Helmet>
        <title>Sign in to GifSpark</title>
        <meta name="description" content="Sign in to GifSpark to turn your portraits into animated photos and short videos." />
        <link rel="canonical" href="https://gifspark.lovable.app/auth" />
        <meta name="robots" content="noindex" />
        <meta property="og:title" content="Sign in to GifSpark" />
        <meta property="og:description" content="Sign in to GifSpark to turn your portraits into animated photos." />
        <meta property="og:url" content="https://gifspark.lovable.app/auth" />
      </Helmet>
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border p-8 text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <span>GifSpark</span>
            <span className="sr-only"> — Sign in</span>
          </h1>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {isNativeBridge ? "Signing you in…" : "Sign in to continue"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isNativeBridge
              ? "You'll be returned to the app automatically."
              : "Sign in to turn your photos into animated photos and short videos."}
          </p>
        </div>
        {isNativeBridge && session ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <Button size="lg" className="w-full h-12 rounded-xl" onClick={handleGoogle}>
            Continue with Google
          </Button>
        )}
      </div>
    </div>
  );
}
