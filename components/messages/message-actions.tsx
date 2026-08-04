"use client";

import type { UIMessage as TMessage } from "ai";
import { useTranslations } from "next-intl";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useCopy } from "@/lib/hooks/use-copy";
import type { MessageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageActions({
  message,
  status,
  isLatestMessage,
  messageText,
  onRegenerate,
  onEdit,
}: {
  message: TMessage;
  status: MessageStatus;
  isLatestMessage: boolean;
  messageText: string;
  onRegenerate?: () => void;
  onEdit?: () => void;
}) {
  const t = useTranslations("common");
  const { copied, copy } = useCopy();

  const isUserMessage = message.role === "user";

  const shouldShowCopyButton =
    message.role === "assistant" &&
    (!isLatestMessage || status !== "streaming");
  const shouldShowRegenerateButton =
    isLatestMessage &&
    message.role === "assistant" &&
    status === "ready";
  const showActions = shouldShowCopyButton || isUserMessage;

  if (!showActions) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 mt-1",
        isUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {shouldShowRegenerateButton && (
        <button
          type="button"
          onClick={onRegenerate}
          className="opacity-0 group-hover/message:opacity-100 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150"
          aria-label={t("regenerate")}
          title={t("regenerate")}
        >
          <RefreshCwIcon className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => copy(messageText)}
        disabled={!messageText}
        className="opacity-0 group-hover/message:opacity-100 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 disabled:opacity-0"
        aria-label={t("copyToClipboard")}
        title={t("copyToClipboard")}
      >
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" />
        )}
      </button>
      {isUserMessage && (
        <button
          type="button"
          onClick={onEdit}
          disabled={status === "streaming" || status === "submitted"}
          className="opacity-0 group-hover/message:opacity-100 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("editMessage")}
          title={t("editMessage")}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
