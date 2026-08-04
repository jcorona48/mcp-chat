"use client";

import type { UIMessage as TMessage } from "ai";
import { useTranslations } from "next-intl";
import { Markdown } from "../markdown";
import { FileChip } from "../file-chip";
import { ReasoningMessagePart, type ReasoningPart } from "./reasoning-message-part";
import { ToolInvocation } from "../tool-invocation";
import type { MessageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ToolLikePart = {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolInvocation?: {
    toolName: string;
    state: "partial-call" | "call" | "result";
    args?: unknown;
    result?: unknown;
    toolCallId?: string;
  };
};

interface ToolRender {
  toolName: string;
  state: string;
  args?: unknown;
  result: unknown;
}

function normalizeToolPart(part: ToolLikePart): ToolRender | null {
  if (part.type === "tool-invocation") {
    if (!part.toolInvocation?.toolName) return null;
    return {
      toolName: part.toolInvocation.toolName,
      state: part.toolInvocation.state ?? "call",
      args: part.toolInvocation.args,
      result: part.toolInvocation.result ?? null,
    };
  }

  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    return {
      toolName: part.toolName ?? part.type.replace(/^tool-/, ""),
      state: part.state || "input-available",
      args: part.input,
      result: part.output ?? part.errorText ?? null,
    };
  }

  return null;
}

export function MessagePartsRenderer({
  message,
  isUserMessage,
  isLatestMessage,
  status,
}: {
  message: TMessage;
  isUserMessage: boolean;
  isLatestMessage: boolean;
  status: MessageStatus;
}) {
  const t = useTranslations("common");

  return (
    <>
      {message.parts?.map((part, i) => {
        const tool = normalizeToolPart(part as ToolLikePart);

        if (tool) {
          return (
            <ToolInvocation
              key={`message-${message.id}-part-${i}`}
              toolName={tool.toolName}
              state={tool.state}
              args={tool.args}
              result={tool.result}
              isLatestMessage={isLatestMessage}
              status={status}
            />
          );
        }

        switch (part.type) {
          case "text": {
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
                      isUserMessage,
                  })}
                >
                  <Markdown>{part.text}</Markdown>
                </div>
              </div>
            );
          }
          case "reasoning":
            return (
              <ReasoningMessagePart
                key={`message-${message.id}-${i}`}
                part={part as ReasoningPart}
                isReasoning={part.state === "streaming"}
              />
            );
          case "file":
            return (
              <div
                key={`message-${message.id}-part-${i}`}
                className="flex flex-row gap-2 items-start w-full"
              >
                <FileChip
                  filename={part.filename}
                  fallbackLabel={t("attachment")}
                  isUserMessage={isUserMessage}
                />
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
