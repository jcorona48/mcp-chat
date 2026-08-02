"use client";
import type { UIMessage as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

export const Messages = ({
  messages,
  isLoading,
  status,
  onEditSubmit,
  onRegenerate,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  onEditSubmit?: (text: string, messageId: string) => void;
  onRegenerate?: () => void;
}) => {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div className="h-full overflow-y-auto no-scrollbar" ref={containerRef}>
      <div className="max-w-lg sm:max-w-3xl mx-auto py-4">
        {messages.map((m, i) => (
          <Message
            key={m.id}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
            onEditSubmit={onEditSubmit}
            onRegenerate={onRegenerate}
          />
        ))}
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
