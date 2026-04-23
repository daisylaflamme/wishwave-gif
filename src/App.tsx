import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { isNativeApp } from "@/lib/platform";
import Index from "./pages/Index.tsx";

const Auth = lazy(() => import("./pages/Auth.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.tsx"));
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
        const sub = await CapApp.addListener("backButton", () => {
          if (location.pathname === "/") {
            CapApp.exitApp();
          } else {
            navigate(-1);
          }
        });
        cleanups.push(() => sub.remove());
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
