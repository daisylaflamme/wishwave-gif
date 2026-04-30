import { useState } from "react";
import { Zap, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp, openExternal } from "@/lib/platform";

interface CreditsBadgeProps {
  onBuyClick: () => void;
}

const WEB_MANAGE_URL = "https://gifspark.lovable.app";

export function CreditsBadge({ onBuyClick }: CreditsBadgeProps) {
  const { credits, loading } = useCredits();
  const { user } = useAuth();
  const native = isNativeApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const label = loading ? "…" : `${credits} ${credits === 1 ? "credit" : "credits"} left`;

  const handleNativeManage = () => setConfirmOpen(true);

  const openWebManage = async () => {
    setConfirmOpen(false);
    const url = new URL(WEB_MANAGE_URL);
    if (user?.email) url.searchParams.set("email", user.email);
    await openExternal(url.toString());
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-medium text-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          {label}
        </div>
        {native ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleNativeManage}
            className="gap-1 min-h-[44px] sm:min-h-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Manage
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onBuyClick}
            className="gap-1 min-h-[44px] sm:min-h-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Buy more
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage your account</DialogTitle>
            <DialogDescription>
              You'll be taken to gifspark.com in your browser to manage your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={openWebManage} className="gap-1.5">
              <ExternalLink className="h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
