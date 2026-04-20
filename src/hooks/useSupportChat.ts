import { useCallback, useRef, useState } from "react";

export type ChatMsg = { role: "user" | "assistant"; content: string };

interface SendOptions {
  signedIn: boolean;
  credits: number | null;
}

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

export function useSupportChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setMessages([]);
    setError(null);
  }, [cancel]);

  const send = useCallback(
    async (input: string, opts: SendOptions) => {
      const text = input.trim();
      if (!text || isStreaming) return;

      setError(null);
      const userMsg: ChatMsg = { role: "user", content: text };
      const next = [...messages, userMsg];
      setMessages(next);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const resp = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: next,
            context: { signedIn: opts.signedIn, credits: opts.credits },
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          let msg = "Something went wrong. Please try again.";
          if (resp.status === 429) msg = "Too many requests. Please wait a moment.";
          else if (resp.status === 402) msg = "AI usage limit reached. Please try again later.";
          try {
            const j = await resp.json();
            if (j?.error) msg = j.error;
          } catch {
            /* noop */
          }
          setError(msg);
          setIsStreaming(false);
          return;
        }
        if (!resp.body) {
          setError("No response from assistant.");
          setIsStreaming(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let done = false;

        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line || line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (typeof c === "string" && c.length > 0) upsertAssistant(c);
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }

        if (buf.trim()) {
          for (let raw of buf.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const json = raw.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (typeof c === "string") upsertAssistant(c);
            } catch {
              /* noop */
            }
          }
        }
      } catch (e: unknown) {
        if ((e as { name?: string })?.name !== "AbortError") {
          console.error("support chat error", e);
          setError("Connection lost. Please try again.");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming],
  );

  return { messages, isStreaming, error, send, cancel, reset };
}
