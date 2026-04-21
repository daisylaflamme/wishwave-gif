import { useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (priceId: string) => {
    if (!user) return;
    setLoadingId(priceId);
    setSelectedPriceId(priceId);
  };

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId: selectedPriceId,
        userId: user?.id,
        customerEmail: user?.email,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (error || !data?.clientSecret) {
      setLoadingId(null);
      throw new Error(error?.message || "Failed to start checkout");
    }
    return data.clientSecret;
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPriceId(null);
      setLoadingId(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Buy GIF Credits
          </DialogTitle>
          <DialogDescription>
            Pick a pack — credits never expire. Secure checkout via Stripe.
          </DialogDescription>
        </DialogHeader>

        {selectedPriceId ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedPriceId(null); setLoadingId(null); }}>
              ← Back to plans
            </Button>
            <div id="checkout">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {PACKS.map((pack) => (
              <div
                key={pack.priceId}
                className={cn(
                  "relative rounded-xl border p-4 flex flex-col",
                  pack.highlight ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border",
                )}
              >
                {pack.badge && (
                  <span
                    className={cn(
                      "absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-semibold px-2 py-0.5 rounded-full",
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
                    {pack.credits === 1 ? "GIF" : "GIFs"}
                  </div>
                </div>
                <div className="text-center mb-3">
                  <div className="text-2xl font-bold">{pack.price}</div>
                  <div className="text-xs text-muted-foreground">{pack.perGif}</div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 mb-4 flex-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary" /> Credits never expire
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary" /> Instant delivery
                  </li>
                </ul>
                <Button
                  onClick={() => handleSelect(pack.priceId)}
                  disabled={loadingId !== null}
                  variant={pack.highlight ? "default" : "outline"}
                  className="w-full"
                >
                  {loadingId === pack.priceId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Buy now"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
