import { Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";

interface CreditsBadgeProps {
  onBuyClick: () => void;
}

export function CreditsBadge({ onBuyClick }: CreditsBadgeProps) {
  const { credits, loading } = useCredits();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-sm font-medium text-foreground">
        <Zap className="h-3.5 w-3.5 text-primary" />
        {loading ? "…" : `${credits} ${credits === 1 ? "GIF" : "GIFs"} left`}
      </div>
      <Button size="sm" variant="outline" onClick={onBuyClick} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
        Buy more
      </Button>
    </div>
  );
}
