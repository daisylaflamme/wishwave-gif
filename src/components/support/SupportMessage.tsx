import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function SupportMessage({ role, content }: Props) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none break-words",
              "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
              "prose-headings:mt-2 prose-headings:mb-1",
              "prose-a:text-primary prose-strong:text-foreground",
            )}
          >
            <ReactMarkdown>{content || "…"}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
