"use client";

import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolConfirmationToggleProps {
  enabled: boolean;
  onToggle: () => void;
  hasToolsAvailable: boolean;
}

export function ToolConfirmationToggle({
  enabled,
  onToggle,
  hasToolsAvailable,
}: ToolConfirmationToggleProps) {
  if (!hasToolsAvailable) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {enabled ? (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            ) : (
              <ShieldOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {enabled
            ? "Confirmación de herramientas: ACTIVADA"
            : "Confirmación de herramientas: DESACTIVADA"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
