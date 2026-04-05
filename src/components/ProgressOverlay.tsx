import { Check, Loader2 } from "lucide-react";
import { STATUS_STEPS } from "@/lib/constants";

interface ProgressOverlayProps {
  currentStatus: string;
  error?: string | null;
}

export function ProgressOverlay({ currentStatus, error }: ProgressOverlayProps) {
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full border">
        <h2 className="text-xl font-bold text-center mb-6 text-foreground">
          Creating your greeting...
        </h2>

        {error ? (
          <div className="text-center">
            <div className="text-4xl mb-4">😕</div>
            <p className="text-destructive font-medium mb-2">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {STATUS_STEPS.map((step, index) => {
              const isComplete = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isComplete
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isComplete
                        ? "text-foreground font-medium"
                        : isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
