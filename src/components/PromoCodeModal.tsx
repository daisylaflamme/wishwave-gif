import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift } from "lucide-react";
import { PromoCodeRedeem } from "@/components/PromoCodeRedeem";

interface PromoCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoCodeModal({ open, onOpenChange }: PromoCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Redeem a promo code
          </DialogTitle>
          <DialogDescription>
            Have a promo code? Enter it below to add free credits to your account.
          </DialogDescription>
        </DialogHeader>
        <PromoCodeRedeem />
      </DialogContent>
    </Dialog>
  );
}
