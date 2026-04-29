import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";

type Phase = "processing" | "ready" | "timeout";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user } = useAuth();
  const { credits, refetch } = useCredits();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("processing");
  const startCreditsRef = useRef<number | null>(null);

  // Capture starting credit balance once on mount
  useEffect(() => {
    if (startCreditsRef.current === null) startCreditsRef.current = credits;
  }, [credits]);

  // Poll Supabase for the webhook to land
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8; // ~16s total

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      const { data } = await refetch();
      const start = startCreditsRef.current ?? 0;
      if ((data?.credits ?? 0) > start) {
        setPhase("ready");
        return;
      }
      if (attempts >= maxAttempts) {
        setPhase("timeout");
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, [user, refetch]);

  // Auto-return to home shortly after credits are confirmed
  useEffect(() => {
    if (phase !== "ready") return;
    const t = setTimeout(() => navigate("/", { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-soft">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border p-8 text-center space-y-4">
        {phase === "processing" && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h1 className="text-2xl font-bold">Payment successful 🎉</h1>
            <p className="text-sm text-muted-foreground">
              Processing your purchase… your credits are being added to your account.
            </p>
          </>
        )}

        {phase === "ready" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold">Your credits are ready</h1>
            <p className="text-sm text-muted-foreground">
              You now have{" "}
              <span className="font-semibold text-foreground">
                {credits} {credits === 1 ? "credit" : "credits"}
              </span>
              . Returning you to GifSpark…
            </p>
            <Button asChild size="lg" className="w-full gap-2 mt-2">
              <Link to="/">
                <Sparkles className="h-4 w-4" />
                Back to GifSpark
              </Link>
            </Button>
          </>
        )}

        {phase === "timeout" && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
            <h1 className="text-2xl font-bold">Payment received</h1>
            <p className="text-sm text-muted-foreground">
              Your payment was received. Credits may take a moment to appear. Please refresh, or
              check your Payment History.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild size="lg" className="w-full gap-2">
                <Link to="/">
                  <Sparkles className="h-4 w-4" />
                  Back to GifSpark
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/payment-history">View Payment History</Link>
              </Button>
            </div>
          </>
        )}

        {sessionId && (
          <p className="text-[10px] text-muted-foreground/60 break-all pt-2">
            Reference: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}
