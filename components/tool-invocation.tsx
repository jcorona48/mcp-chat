"use client";

import { useEffect, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  CheckCircle2,
  TerminalSquare,
  Code,
  ArrowRight,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationProps {
  toolName: string;
  state: string;
  args: any;
  result: any;
  isLatestMessage: boolean;
  status: string;
}

export function ToolInvocation({
  toolName,
  state,
  args,
  result,
  isLatestMessage,
  status,
}: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const normalizedState = state ?? "input-streaming";
  const isLegacyCall =
    normalizedState === "partial-call" ||
    normalizedState === "call" ||
    normalizedState === "result";
  const isRunning =
    normalizedState === "input-streaming" ||
    normalizedState === "input-available" ||
    normalizedState === "partial-call" ||
    normalizedState === "call";
  const isCompleted =
    normalizedState === "output-available" ||
    normalizedState === "result";
  const isErrored = normalizedState === "output-error";

  useEffect(() => {
    if (isLatestMessage && status !== "ready" && (isRunning || isCompleted)) {
      setIsExpanded(true);
    }
  }, [isLatestMessage, isRunning, status]);

  const getStatusIcon = () => {
    if (isRunning) {
      if (isLatestMessage && status !== "ready") {
        return <Loader2 className="animate-spin h-3.5 w-3.5 text-primary/70" />;
      }
      return (
        <Circle className="h-3.5 w-3.5 fill-muted-foreground/10 text-muted-foreground/70" />
      );
    }
    if (isErrored) {
      return <Circle className="h-3.5 w-3.5 fill-red-500/20 text-red-400" />;
    }
    return <CheckCircle2 size={14} className="text-primary/90" />;
  };

  const getStatusClass = () => {
    if (isRunning) {
      if (isLatestMessage && status !== "ready") {
        return "text-primary";
      }
      return "text-muted-foreground";
    }
    if (isErrored) {
      return "text-red-400";
    }
    return "text-primary";
  };

  const formatContent = (content: any): string => {
    try {
      if (typeof content === "string") {
        try {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return content;
        }
      }
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col mb-2 rounded-md border border-border/50 overflow-hidden",
        "bg-linear-to-b from-background to-muted/30 backdrop-blur-sm",
        "transition-all duration-200 hover:border-border/80 group"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
          "hover:bg-muted/20"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center rounded-full w-5 h-5 bg-primary/5 text-primary">
          <TerminalSquare className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground flex-1">
          <span className="text-foreground font-semibold tracking-tight">
            {toolName}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
          <span className={cn("font-medium", getStatusClass())}>
            {isRunning
              ? isLatestMessage && status !== "ready"
                ? "Running"
                : "Waiting"
              : isErrored
                ? "Error"
                : isCompleted
                  ? "Completed"
                  : normalizedState}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
          {getStatusIcon()}
          <div className="bg-muted/30 rounded-full p-0.5 border border-border/30">
            {isExpanded ? (
              <ChevronUpIcon className="h-3 w-3 text-foreground/70" />
            ) : (
              <ChevronDownIcon className="h-3 w-3 text-foreground/70" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 px-3 pb-3">
          {!!args && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1.5">
                <Code className="h-3 w-3" />
                <span className="font-medium">Arguments</span>
              </div>
              <pre
                className={cn(
                  "text-xs font-mono p-2.5 rounded-md overflow-x-auto",
                  "border border-border/40 bg-muted/10"
                )}
              >
                {formatContent(args)}
              </pre>
            </div>
          )}

          {!!result && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">Result</span>
              </div>
              <pre
                className={cn(
                  "text-xs font-mono p-2.5 rounded-md overflow-x-auto max-h-75 overflow-y-auto",
                  "border border-border/40 bg-muted/10"
                )}
              >
                {formatContent(result)}
              </pre>
            </div>
          )}

          {!args && !result && isLegacyCall && (
            <div className="text-xs text-muted-foreground/70 pt-1">
              Calling legacy tool invocation...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
