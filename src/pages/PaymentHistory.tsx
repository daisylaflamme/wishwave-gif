import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/platform";

export default function PaymentHistory() {
  const { user, loading: authLoading } = useAuth();

  // Hide payment surfaces inside the native app
  if (isNativeApp()) return <Navigate to="/" replace />;

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(
          "id, package_name, credits_added, amount_cents, currency, status, created_at, stripe_session_id",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to GifSpark
          </Link>
        </Button>

        <div className="bg-card rounded-2xl shadow-lg border p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Payment History</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Your past credit purchases.
          </p>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
          ) : purchases.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            </div>
          ) : (
            <div className="divide-y border rounded-xl overflow-hidden">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.package_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()} · +{p.credits_added} credits
                    </div>
                    {p.stripe_session_id && (
                      <div className="text-[10px] text-muted-foreground/60 break-all mt-0.5">
                        Ref: {p.stripe_session_id}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-medium">
                      ${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}
                    </span>
                    <StatusIcon status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
      </span>
    );
  if (status === "pending")
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600">
        <Clock className="h-3.5 w-3.5" /> Pending
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <XCircle className="h-3.5 w-3.5" /> Failed
    </span>
  );
}
