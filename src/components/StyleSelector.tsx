import { cn } from "@/lib/utils";

interface StyleOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface StyleSelectorProps {
  label: string;
  options: readonly StyleOption[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function StyleSelector({ label, options, value, onChange, compact = false }: StyleSelectorProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onChange(option.id)}
                title={option.description}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  selected
                    ? "border-primary bg-primary/10 text-foreground shadow-sm"
                    : "border-border bg-background hover:border-primary/30 hover:bg-muted/50 text-foreground/80"
                )}
              >
                <span className="text-sm leading-none">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
              value === option.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/30 hover:bg-muted/50"
            )}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-sm text-foreground">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
