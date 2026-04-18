"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function ReasoningToggle({ enabled, onToggle }: ReasoningToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 rounded-full",
              enabled
                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                : "bg-muted dark:bg-muted/50"
            )}
          >
            {enabled ? (
              <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Razonamiento avanzado: {enabled ? "ACTIVADO" : "DESACTIVADO"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
