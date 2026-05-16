import { useState } from "react";
import { Loader2, Gift, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useQueryClient } from "@tanstack/react-query";

export function PromoCodeRedeem() {
  const { user } = useAuth();
  const { refetch } = useCredits();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setError(null);
    setSuccess(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a promo code.");
      return;
    }
    if (!user) {
      setError("Please sign in to redeem.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "redeem-promo-code",
        { body: { code: trimmed } },
      );
      if (invokeError) {
        const ctx = (invokeError as unknown as { context?: Response }).context;
        let msg = invokeError.message || "Something went wrong.";
        try {
          const parsed = ctx ? await ctx.json() : null;
          if (parsed?.error) msg = parsed.error;
        } catch {
          /* noop */
        }
        setError(msg);
        return;
      }
      if (!data?.ok) {
        setError(data?.error || "Something went wrong.");
        return;
      }
      setSuccess(`Promo applied — ${data.creditsAdded} free credits added.`);
      setCode("");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Gift className="h-4 w-4 text-primary" />
        Have a promo code?
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
            if (success) setSuccess(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!loading) handleApply();
            }
          }}
          placeholder="Enter code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          disabled={loading}
          className="uppercase"
        />
        <Button onClick={handleApply} disabled={loading || !code.trim()} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {success && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {success}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
