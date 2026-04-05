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
}

export function StyleSelector({ label, options, value, onChange }: StyleSelectorProps) {
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
