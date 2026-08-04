"use client";

import type { UIMessage as TMessage } from "ai";
import { memo, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Markdown } from "../markdown";
import { MessageEditForm } from "./message-edit-form";
import { MessagePartsRenderer } from "./message-parts";
import { MessageActions } from "./message-actions";
import type { MessageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

const COLLAPSE_CHAR_THRESHOLD = 4000;
const COLLAPSE_PREVIEW_LENGTH = 1200;

interface MessageProps {
  message: TMessage;
  status: MessageStatus;
  isLatestMessage: boolean;
  onEditSubmit?: (text: string, messageId: string) => void;
  onRegenerate?: () => void;
  onToolApproval?: (approvalId: string, approved: boolean) => void;
}

function MessageComponent({
  message,
  status,
  isLatestMessage,
  onEditSubmit,
  onRegenerate,
  onToolApproval,
}: MessageProps) {
  const t = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isUserMessage = message.role === "user";

  const messageText = useMemo(() => {
    if (!message.parts) return "";
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n\n");
  }, [message.parts]);

  const isCollapsible =
    status === "ready" && messageText.length > COLLAPSE_CHAR_THRESHOLD;

  const collapsedPreview = useMemo(() => {
    if (messageText.length <= COLLAPSE_PREVIEW_LENGTH) return messageText;
    const cut = messageText.slice(0, COLLAPSE_PREVIEW_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 600 ? lastSpace : cut.length)}…`;
  }, [messageText]);

  const toggleButton = (expanded: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 self-start rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
      aria-label={expanded ? t("collapseMessage") : t("expandMessage")}
      title={expanded ? t("collapseMessage") : t("expandMessage")}
    >
      {expanded ? (
        <ChevronUpIcon className="h-3.5 w-3.5" />
      ) : (
        <ChevronDownIcon className="h-3.5 w-3.5" />
      )}
      {expanded ? t("collapseMessage") : t("expandMessage")}
    </button>
  );

  return (
    <div
      className={cn(
        "w-full mx-auto px-4 group/message",
        isUserMessage ? "mb-6" : "mb-8"
      )}
      data-role={message.role}
    >
      <div
        className={cn(
          "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
          "group-data-[role=user]/message:w-fit"
        )}
      >
        <div className="flex flex-col w-full space-y-3">
          {isUserMessage && isEditing ? (
            <MessageEditForm
              initialText={messageText}
              onSubmit={(text) => {
                onEditSubmit?.(text, message.id);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : isCollapsible && !isExpanded ? (
            <div
              key={`collapsed-${message.id}`}
              className={cn("flex flex-col gap-3 w-full", {
                "bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl":
                  isUserMessage,
              })}
            >
              <Markdown>{collapsedPreview}</Markdown>
              {toggleButton(false, () => setIsExpanded(true))}
            </div>
          ) : (
            <>
              <MessagePartsRenderer
                message={message}
                isUserMessage={isUserMessage}
                isLatestMessage={isLatestMessage}
                status={status}
                onToolApproval={onToolApproval}
              />
              {isCollapsible && toggleButton(true, () => setIsExpanded(false))}
            </>
          )}
          <MessageActions
            message={message}
            status={status}
            isLatestMessage={isLatestMessage}
            messageText={messageText}
            onRegenerate={onRegenerate}
            onEdit={() => setIsEditing(true)}
          />
        </div>
      </div>
    </div>
  );
}

export const Message = memo(MessageComponent);
