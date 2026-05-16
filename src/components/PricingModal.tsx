import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, Zap, Lock } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { cn } from "@/lib/utils";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Pack {
  priceId: string;
  credits: number;
  price: string;
  perGif: string;
  badge?: string;
  highlight?: boolean;
}

const PACKS: Pack[] = [
  { priceId: "credits_1_onetime", credits: 1, price: "$0.99", perGif: "$0.99 each" },
  { priceId: "credits_3_onetime", credits: 3, price: "$2.59", perGif: "$0.86 each", badge: "Save 13%" },
  {
    priceId: "credits_10_onetime",
    credits: 10,
    price: "$6.99",
    perGif: "$0.70 each",
    badge: "Best value",
    highlight: true,
  },
];

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [stagedPriceId, setStagedPriceId] = useState<string>("credits_10_onetime");
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!user || !stagedPriceId) return;
    setStartError(null);
    setLoading(true);
    setSelectedPriceId(stagedPriceId);
  };

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: selectedPriceId,
          returnUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (error || !data?.clientSecret) {
        throw new Error(error?.message || "We couldn't start secure checkout. Please try again.");
      }
      return data.clientSecret;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error starting checkout.";
      setStartError(msg);
      setSelectedPriceId(null);
      setLoading(false);
      throw e;
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPriceId(null);
      setLoading(false);
      setStartError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Buy Credits
          </DialogTitle>
          <DialogDescription>
            Pick a credit pack to keep creating animated photos. Credits never expire.
          </DialogDescription>
        </DialogHeader>

        {/* Current balance */}
        <div className="flex items-center justify-between rounded-xl border bg-primary/5 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Current balance</span>
          </div>
          <span className="font-semibold">
            {creditsLoading ? "…" : `${credits} ${credits === 1 ? "credit" : "credits"}`}
          </span>
        </div>

        {selectedPriceId ? (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPriceId(null);
                setLoading(false);
              }}
            >
              ← Back to packs
            </Button>
            <div id="checkout">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {PACKS.map((pack) => {
                const selected = stagedPriceId === pack.priceId;
                return (
                  <button
                    key={pack.priceId}
                    type="button"
                    onClick={() => setStagedPriceId(pack.priceId)}
                    aria-pressed={selected}
                    className={cn(
                      "relative rounded-xl border p-4 flex flex-col text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selected
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                        : pack.highlight
                          ? "border-primary/40 bg-primary/[0.02] hover:border-primary"
                          : "border-border hover:border-primary/40",
                    )}
                  >
                    {pack.badge && (
                      <span
                        className={cn(
                          "absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                          pack.highlight
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground",
                        )}
                      >
                        {pack.badge}
                      </span>
                    )}
                    <div className="text-center space-y-1 mb-3">
                      <div className="text-3xl font-bold">{pack.credits}</div>
                      <div className="text-xs text-muted-foreground">
                        {pack.credits === 1 ? "Credit" : "Credits"}
                      </div>
                    </div>
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold">{pack.price}</div>
                      <div className="text-xs text-muted-foreground">{pack.perGif}</div>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 flex-1">
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-primary" /> Credits never expire
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-primary" /> Instant delivery
                      </li>
                    </ul>
                    {selected && (
                      <div className="mt-3 text-center text-xs font-medium text-primary">
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {startError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {startError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => handleClose(false)}
                className="sm:flex-1 order-2 sm:order-1"
              >
                Maybe later
              </Button>
              <Button
                onClick={handleContinue}
                disabled={loading || !stagedPriceId}
                className="sm:flex-1 gap-2 order-1 sm:order-2"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Continue to purchase
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Secure checkout · Powered by Stripe
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
