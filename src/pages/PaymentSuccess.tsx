import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user } = useAuth();
  const { credits, refetch } = useCredits();
  const [waiting, setWaiting] = useState(true);
  const [startCredits] = useState(credits);

  useEffect(() => {
    if (!user) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const { data } = await refetch();
      if ((data?.credits ?? 0) > startCredits || attempts > 15) {
        setWaiting(false);
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [user, refetch, startCredits]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-soft">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border p-8 text-center space-y-4">
        {waiting ? (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h1 className="text-2xl font-bold">Confirming your payment…</h1>
            <p className="text-sm text-muted-foreground">
              Hang tight — we're adding your credits now.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold">Payment successful!</h1>
            <p className="text-sm text-muted-foreground">
              Your credits have been added. You now have{" "}
              <span className="font-semibold text-foreground">
                {credits} {credits === 1 ? "GIF" : "GIFs"}
              </span>{" "}
              ready to go.
            </p>
            <Button asChild size="lg" className="w-full gap-2 mt-2">
              <Link to="/">
                <Sparkles className="h-4 w-4" />
                Create a GIF
              </Link>
            </Button>
          </>
        )}
        {sessionId && (
          <p className="text-[10px] text-muted-foreground/60 break-all pt-2">
            Receipt ref: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}
