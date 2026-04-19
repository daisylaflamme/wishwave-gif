import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Clock, XCircle, Receipt } from "lucide-react";

export function PurchaseHistory() {
  const { user } = useAuth();

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, package_name, credits_added, amount_cents, currency, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user || purchases.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4" />
        Purchase history
      </h2>
      <div className="bg-card rounded-xl border divide-y">
        {purchases.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <div className="font-medium">{p.package_name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString()} · +{p.credits_added} credits
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">
                ${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}
              </span>
              <StatusIcon status={p.status} />
            </div>
          </div>
        ))}
      </div>
    </section>
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
