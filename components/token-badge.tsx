"use client";

import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTokenCount, type TokenUsage } from "@/lib/chat/usage";
import { cn } from "@/lib/utils";

interface TokenBadgeProps {
  usage: TokenUsage | null;
  className?: string;
}

export function TokenBadge({ usage, className }: TokenBadgeProps) {
  if (!usage || usage.totalTokens <= 0) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] font-normal tabular-nums",
        className,
      )}
    >
      <Hash className="h-3 w-3" />
      {formatTokenCount(usage.totalTokens)}
    </Badge>
  );
}
