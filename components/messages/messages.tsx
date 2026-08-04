"use client";
import type { UIMessage as TMessage } from "ai";
import { Message } from "./message";
import type { MessageStatus } from "@/lib/types";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

export const Messages = ({
  messages,
  status,
  onEditSubmit,
  onRegenerate,
  onToolApproval,
}: {
  messages: TMessage[];
  status: MessageStatus;
  onEditSubmit?: (text: string, messageId: string) => void;
  onRegenerate?: () => void;
  onToolApproval?: (approvalId: string, approved: boolean) => void;
}) => {
  const [containerRef, endRef] = useScrollToBottom();

  return (
    <div className="h-full overflow-y-auto no-scrollbar" ref={containerRef}>
      <div className="max-w-lg sm:max-w-3xl mx-auto py-4">
        {messages.map((m, i) => (
          <Message
            key={m.id}
            isLatestMessage={i === messages.length - 1}
            message={m}
            status={status}
            onEditSubmit={onEditSubmit}
            onRegenerate={onRegenerate}
            onToolApproval={onToolApproval}
          />
        ))}
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
