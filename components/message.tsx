"use client";

import type { UIMessage as TMessage } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Markdown } from "./markdown";
import { FileChip } from "./file-chip";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  LightbulbIcon,
  PencilIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { SpinnerIcon } from "./icons";
import { ToolInvocation } from "./tool-invocation";
import { useCopy } from "@/lib/hooks/use-copy";

interface ReasoningPart {
  type: "reasoning";
  text?: string;
  reasoningText?: string;
  state?: "streaming" | "done";
  details?: Array<{ type: "text"; text: string }>;
}

interface ReasoningMessagePartProps {
  part: ReasoningPart;
  isReasoning: boolean;
}

export function ReasoningMessagePart({
  part,
  isReasoning,
}: ReasoningMessagePartProps) {
  const t = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);
  const isStreamingReasoning = part.state === "streaming" || isReasoning;

  const memoizedSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  useEffect(() => {
    memoizedSetIsExpanded(isStreamingReasoning);
  }, [isStreamingReasoning, memoizedSetIsExpanded]);

  return (
    <div className="flex flex-col mb-2 group">
      {isStreamingReasoning ? (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-full py-1.5 px-3",
            "bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300",
            "border border-indigo-200/50 dark:border-indigo-700/20 w-fit"
          )}
        >
          <div className="animate-spin h-3.5 w-3.5">
            <SpinnerIcon />
          </div>
          <div className="text-xs font-medium tracking-tight">{t("thinking")}</div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center justify-between w-full",
            "rounded-md py-2 px-3 mb-0.5",
            "bg-muted/50 border border-border/60 hover:border-border/80",
            "transition-all duration-150 cursor-pointer",
            isExpanded ? "bg-muted border-primary/20" : ""
          )}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full",
                "bg-amber-50 dark:bg-amber-900/20",
                "text-amber-600 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700/30"
              )}
            >
              <LightbulbIcon className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
              {t("reasoning")}
              <span className="text-xs text-muted-foreground font-normal">
                (click to {isExpanded ? t("clickToHide") : t("clickToView")})
              </span>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center justify-center",
              "rounded-full p-0.5 w-5 h-5",
              "text-muted-foreground hover:text-foreground",
              "bg-background/80 border border-border/50",
              "transition-colors"
            )}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronUpIcon className="h-3 w-3" />
            )}
          </div>
        </button>
      )}

      {isExpanded && (
        <div
          className={cn(
            "text-sm text-muted-foreground flex flex-col gap-2",
            "pl-3.5 ml-0.5 mt-1",
            "border-l border-amber-200/50 dark:border-amber-700/30"
          )}
        >
          <div className="text-xs text-muted-foreground/70 pl-1 font-medium">
            {t("assistantThoughtProcess")}
          </div>
          {part.details?.length ? (
            part.details.map((detail, detailIndex) =>
              detail.type === "text" ? (
                <div
                  key={detailIndex}
                  className="px-2 py-1.5 bg-muted/10 rounded-md border border-border/30"
                >
                  <Markdown>{detail.text}</Markdown>
                </div>
              ) : (
                "<redacted>"
              )
            )
          ) : (part.text ?? part.reasoningText) ? (
            <div className="px-2 py-1.5 bg-muted/10 rounded-md border border-border/30">
              <Markdown>{part.text ?? part.reasoningText ?? ""}</Markdown>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const COLLAPSE_CHAR_THRESHOLD = 4000;
const COLLAPSE_PREVIEW_LENGTH = 1200;

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
  onEditSubmit,
  onRegenerate,
}: {
  message: TMessage;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  onEditSubmit?: (text: string, messageId: string) => void;
  onRegenerate?: () => void;
}) => {
  const t = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { copied, copy } = useCopy();

  // Create a string with all text parts for copy functionality
  const getMessageText = () => {
    if (!message.parts) return "";
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n\n");
  };

  const handleStartEdit = () => {
    setEditDraft(getMessageText());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditDraft("");
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft.trim()) return;
    onEditSubmit?.(editDraft, message.id);
    setIsEditing(false);
  };

  // Only show copy button if the message is from the assistant and not currently streaming
  const shouldShowCopyButton =
    message.role === "assistant" &&
    (!isLatestMessage || status !== "streaming");

  // Only show regenerate button on the latest assistant message when idle
  const shouldShowRegenerateButton =
    isLatestMessage &&
    message.role === "assistant" &&
    status === "ready";

  const isUserMessage = message.role === "user";
  const showActions = shouldShowCopyButton || isUserMessage;
  const copyMessageText = () => copy(getMessageText());

  const fullText = getMessageText();
  const isCollapsible =
    status === "ready" && fullText.length > COLLAPSE_CHAR_THRESHOLD;

  const collapsedPreview = useMemo(() => {
    if (fullText.length <= COLLAPSE_PREVIEW_LENGTH) return fullText;
    const cut = fullText.slice(0, COLLAPSE_PREVIEW_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 600 ? lastSpace : cut.length)}…`;
  }, [fullText]);

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
        message.role === "assistant" ? "mb-8" : "mb-6"
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
            <form
              onSubmit={handleSubmitEdit}
              className="bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl"
            >
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                autoFocus
                rows={Math.min(8, Math.max(2, editDraft.split("\n").length))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                  if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
                className="w-full resize-y bg-transparent text-sm focus:outline-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-full p-2 text-muted-foreground hover:bg-foreground/5 transition-colors"
                  aria-label={t("cancelEdit")}
                >
                  <XIcon className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!editDraft.trim()}
                  className="rounded-full p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                  aria-label={t("sendEdit")}
                >
                  <CheckIcon className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
            </form>
          ) : isCollapsible && !isExpanded ? (
            <div
              key={`collapsed-${message.id}`}
              className={cn("flex flex-col gap-3 w-full", {
                "bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl":
                  message.role === "user",
              })}
            >
              <Markdown>{collapsedPreview}</Markdown>
              {toggleButton(false, () => setIsExpanded(true))}
            </div>
          ) : (
            <>
              {message.parts?.map((part, i) => {
              if (part.type === "dynamic-tool") {
              const dynamicToolPart = part as {
                type: "dynamic-tool";
                toolName: string;
                state?: string;
                input?: unknown;
                output?: unknown;
                errorText?: string;
              };

              return (
                <ToolInvocation
                  key={`message-${message.id}-part-${i}`}
                  toolName={dynamicToolPart.toolName}
                  state={dynamicToolPart.state || "input-available"}
                  args={dynamicToolPart.input}
                  result={dynamicToolPart.output ?? dynamicToolPart.errorText ?? null}
                  isLatestMessage={isLatestMessage}
                  status={status}
                />
              );
            }

            if (part.type === "tool-invocation") {
              const legacyPart = part as unknown as {
                type: "tool-invocation";
                toolInvocation: {
                  toolName: string;
                  state: "partial-call" | "call" | "result";
                  args?: unknown;
                  result?: unknown;
                  toolCallId?: string;
                };
              };

              return (
                <ToolInvocation
                  key={`message-${message.id}-part-${i}`}
                  toolName={legacyPart.toolInvocation.toolName}
                  state={legacyPart.toolInvocation.state}
                  args={legacyPart.toolInvocation.args}
                  result={legacyPart.toolInvocation.result ?? null}
                  isLatestMessage={isLatestMessage}
                  status={status}
                />
              );
            }

            if (part.type.startsWith("tool-")) {
              const toolPart = part as {
                type: string;
                state?: string;
                toolName?: string;
                toolCallId?: string;
                input?: unknown;
                output?: unknown;
                errorText?: string;
              };

              const normalizedToolName =
                toolPart.toolName ?? toolPart.type.replace(/^tool-/, "");

              return (
                <ToolInvocation
                  key={`message-${message.id}-part-${i}`}
                  toolName={normalizedToolName}
                  state={toolPart.state || "input-available"}
                  args={toolPart.input}
                  result={toolPart.output ?? toolPart.errorText ?? null}
                  isLatestMessage={isLatestMessage}
                  status={status}
                />
              );
            }

            switch (part.type) {
              case "text":
                if (
                  typeof part.text !== "string" ||
                  part.text.trim().length === 0
                ) {
                  return null;
                }
                return (
                  <div
                    key={`message-${message.id}-part-${i}`}
                    className="flex flex-row gap-2 items-start w-full"
                  >
                    <div
                      className={cn("flex flex-col gap-3 w-full", {
                        "bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl":
                          message.role === "user",
                      })}
                    >
                      <Markdown>{part.text}</Markdown>
                    </div>
                  </div>
                );
              case "reasoning":
                return (
                  <ReasoningMessagePart
                    key={`message-${message.id}-${i}`}
                    part={part as ReasoningPart}
                    isReasoning={part.state === "streaming"}
                  />
                );
              case "file": {
                const filePart = part as {
                  type: string;
                  filename?: string;
                  mediaType?: string;
                  url?: string;
                };
                return (
                  <div
                    key={`message-${message.id}-part-${i}`}
                    className="flex flex-row gap-2 items-start w-full"
                  >
                    <FileChip
                      filename={filePart.filename}
                      fallbackLabel={t("attachment")}
                      isUserMessage={isUserMessage}
                    />
                  </div>
                );
              }
                default:
                  return null;
              }
            })}
            {isCollapsible && toggleButton(true, () => setIsExpanded(false))}
            </>
          )}
          {showActions && (
            <div
              className={cn(
                "flex items-center gap-1 mt-1",
                isUserMessage ? "justify-end" : "justify-start"
              )}
            >
              {shouldShowRegenerateButton && (
                <button
                  onClick={onRegenerate}
                  className="opacity-0 group-hover/message:opacity-100 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150"
                  aria-label={t("regenerate")}
                  title={t("regenerate")}
                >
                  <RefreshCwIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={copyMessageText}
                disabled={!getMessageText()}
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
                  onClick={handleStartEdit}
                  disabled={status === "streaming" || status === "submitted"}
                  className="opacity-0 group-hover/message:opacity-100 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("editMessage")}
                  title={t("editMessage")}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Message = PurePreviewMessage;
