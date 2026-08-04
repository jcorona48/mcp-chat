"use client";

import { Hash } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  formatTokenCount,
  getMessageUsage,
  type TokenUsage,
} from "@/lib/chat/usage";
import { cn } from "@/lib/utils";

export interface UsageMessage {
  id: string;
  role: string;
  parts?: Array<{ type: string }> | null;
}

interface TokenBadgeProps {
  usage: TokenUsage | null;
  messages?: UsageMessage[] | null;
  className?: string;
}

interface TokenBreakdownProps {
  usage: TokenUsage;
  messages?: UsageMessage[] | null;
}

/**
 * Per-message token breakdown. Rendered inside the TokenBadge popover and the
 * composer "more" submenu (mobile).
 */
export function TokenBreakdown({ usage, messages }: TokenBreakdownProps) {
  const t = useTranslations("chat");

  const messagesWithUsage = (messages ?? []).filter(
    (m) => getMessageUsage(m.parts) !== null,
  );

  if (messagesWithUsage.length === 0) {
    return (
      <div className="px-1 text-[10px] text-muted-foreground">
        <span className="font-medium">{t("total")}:</span>{" "}
        <span className="tabular-nums text-foreground/70">
          {formatTokenCount(usage.totalTokens)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {t("tokensPerMessage")}
      </div>
      {messagesWithUsage.map((message) => {
        const messageUsage = getMessageUsage(message.parts);
        if (!messageUsage) {
          return null;
        }
        return (
          <div
            key={message.id}
            className="flex items-center justify-between px-1 py-0.5 text-[10px]"
          >
            <span className="truncate flex-1 text-muted-foreground">
              {message.role === "user" ? t("you") : t("assistant")}
            </span>
            <span className="tabular-nums text-foreground/70">
              {formatTokenCount(messageUsage.totalTokens)}
            </span>
          </div>
        );
      })}
      <div className="mt-1 flex items-center justify-between border-t border-border/40 px-1 pt-1 text-[10px] font-medium">
        <span>{t("total")}</span>
        <span className="tabular-nums">
          {usage.totalTokens.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function TokenBadge({ usage, messages, className }: TokenBadgeProps) {
  const t = useTranslations("chat");

  if (!usage || usage.totalTokens <= 0) {
    return null;
  }

  const messagesWithUsage = (messages ?? []).filter(
    (m) => getMessageUsage(m.parts) !== null,
  );

  const badge = (
    <Badge
      variant="secondary"
      className={cn(
        "cursor-pointer text-[10px] font-normal tabular-nums",
        className,
      )}
    >
      <Hash className="h-3 w-3" />
      {formatTokenCount(usage.totalTokens)}
    </Badge>
  );

  if (!messages || messagesWithUsage.length === 0) {
    return badge;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <TokenBreakdown usage={usage} messages={messages} />
      </PopoverContent>
    </Popover>
  );
}
