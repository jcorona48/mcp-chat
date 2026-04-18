import type { UIMessage as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";
import { useEffect, useRef, useMemo } from "react";

export const Messages = ({
  messages,
  isLoading,
  status,
  reasoningEnabled = false,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  reasoningEnabled?: boolean;
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  const messageCountRef = useRef(messages.length);

  useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages.length]);

  const renderedMessages = useMemo(
    () =>
      messages.map((m, i) => (
        <Message
          key={i}
          isLatestMessage={i === messages.length - 1}
          isLoading={isLoading}
          message={m}
          status={status}
          reasoningEnabled={reasoningEnabled}
        />
      )),
    [messages, isLoading, status, reasoningEnabled]
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar" ref={containerRef}>
      <div className="max-w-lg sm:max-w-3xl mx-auto py-4">
        {renderedMessages}
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
