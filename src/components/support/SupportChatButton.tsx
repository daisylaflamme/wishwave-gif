import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportChatPanel } from "./SupportChatPanel";
import { cn } from "@/lib/utils";

interface Props {
  hidden?: boolean;
}

export function SupportChatButton({ hidden }: Props) {
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        aria-label={open ? "Close support chat" : "Open support chat"}
        className={cn(
          "fixed right-5 sm:right-6 z-50 bottom-safe sm:bottom-6",
          "h-14 w-14 rounded-full shadow-lg shadow-primary/30",
          "transition-transform active:scale-95 sm:hover:scale-105",
          !open && "animate-in fade-in",
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-0 sm:group-hover:opacity-100" />
          </>
        )}
      </Button>

      <SupportChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
