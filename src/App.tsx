import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { isNativeApp } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index.tsx";

const NATIVE_AUTH_CALLBACK_PREFIX = "gifspark://auth/callback";

const Auth = lazy(() => import("./pages/Auth.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.tsx"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel.tsx"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

/** Wire up native back-button + status-bar styling once when running in Capacitor. */
function NativeShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanups: Array<() => void> = [];

    (async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        const backSub = await CapApp.addListener("backButton", () => {
          if (location.pathname === "/") {
            CapApp.exitApp();
          } else {
            navigate(-1);
          }
        });
        cleanups.push(() => backSub.remove());

        // Deep-link handler: completes Google OAuth started in the in-app browser.
        const urlSub = await CapApp.addListener("appUrlOpen", async ({ url }) => {
          if (!url?.startsWith(NATIVE_AUTH_CALLBACK_PREFIX)) return;
          try {
            const hash = url.split("#")[1] ?? "";
            const params = new URLSearchParams(hash);
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          } catch (e) {
            console.warn("Failed to set session from deep link", e);
          }
          try {
            const { Browser } = await import("@capacitor/browser");
            await Browser.close();
          } catch {
            /* browser plugin optional */
          }
          navigate("/", { replace: true });
        });
        cleanups.push(() => urlSub.remove());
      } catch (e) {
        console.warn("Capacitor App plugin unavailable", e);
      }

      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        /* status-bar plugin optional */
      }
    })();

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [navigate, location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NativeShell />
          <PaymentTestModeBanner />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/legal" element={<Legal />} />
              <Route
                path="/payment-success"
                element={isNativeApp() ? <Navigate to="/" replace /> : <PaymentSuccess />}
              />
              <Route
                path="/payment-cancel"
                element={isNativeApp() ? <Navigate to="/" replace /> : <PaymentCancel />}
              />
              <Route
                path="/payment-history"
                element={isNativeApp() ? <Navigate to="/" replace /> : <PaymentHistory />}
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
