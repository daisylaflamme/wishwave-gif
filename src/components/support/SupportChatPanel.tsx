import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { X, Send, Sparkles, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupportChat } from "@/hooks/useSupportChat";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { SupportMessage } from "./SupportMessage";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  "How do I create a GIF?",
  "How much does it cost?",
  "Why is generation slow?",
  "What photos work best?",
];

export function SupportChatPanel({ open, onClose }: Props) {
  const { user } = useAuth();
  const { credits } = useCredits();
  const { messages, isStreaming, error, send, cancel } = useSupportChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    else cancel();
  }, [open, cancel]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isStreaming) return;
    setInput("");
    send(value, { signedIn: !!user, credits: user ? credits : null });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  const showSuggestions = messages.length === 0 && !isStreaming;
  const lastIsAssistantEmpty =
    isStreaming &&
    (messages.length === 0 ||
      messages[messages.length - 1].role === "user" ||
      messages[messages.length - 1].content.length === 0);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm sm:hidden"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-label="Support chat"
        className={cn(
          "fixed z-50 flex flex-col bg-card border shadow-2xl",
          // Mobile: full-screen sheet from bottom
          "inset-x-0 bottom-0 top-16 rounded-t-2xl",
          // Desktop: floating card bottom-right
          "sm:inset-auto sm:top-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-2xl",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">GifSpark Assistant</p>
              <p className="text-[11px] text-muted-foreground">Ask about GIFs, credits & more</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 px-3 py-3">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                👋 Hi! I can help you with creating GIFs, credits, pricing, and tips for the best
                results. What would you like to know?
              </div>
            )}

            {messages.map((m, i) => (
              <SupportMessage key={i} role={m.role} content={m.content} />
            ))}

            {lastIsAssistantEmpty && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3 space-y-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about GifSpark…"
              rows={1}
              className="min-h-[40px] max-h-32 resize-none text-sm py-2"
            />
            {isStreaming ? (
              <Button
                size="icon"
                variant="outline"
                onClick={cancel}
                aria-label="Stop"
                className="shrink-0"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                aria-label="Send"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <a
            href="mailto:administrator@daisylaflamme.net"
            className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-3 w-3" />
            Need a human? Contact support
          </a>
        </div>
      </div>
    </>
  );
}
