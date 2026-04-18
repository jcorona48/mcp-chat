"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, AlertTriangle, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolsStatusBadgeProps {
  toolCount: number;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export function ToolsStatusBadge({
  toolCount,
  isLoading,
  hasError,
  errorMessage,
}: ToolsStatusBadgeProps) {
  if (toolCount === 0 && !isLoading && !hasError) {
    return null;
  }

  const getIcon = () => {
    if (isLoading) {
      return <Loader className="h-3.5 w-3.5 animate-spin" />;
    }
    if (hasError) {
      return <AlertTriangle className="h-3.5 w-3.5" />;
    }
    return <Zap className="h-3.5 w-3.5" />;
  };

  const getStyles = () => {
    if (isLoading) {
      return "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
    }
    if (hasError) {
      return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50";
    }
    return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50";
  };

  const getLabel = () => {
    if (isLoading) return "Conectando...";
    if (hasError) return "Error";
    return `${toolCount}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium",
              "border transition-all duration-200",
              "hover:shadow-sm",
              getStyles()
            )}
          >
            {getIcon()}
            <span className="font-semibold">{getLabel()}</span>
            {!isLoading && !hasError && (
              <span className="text-[11px] sm:text-xs text-current/70">
                {toolCount === 1 ? "herramienta" : "herramientas"}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          {hasError ? (
            <div className="space-y-1">
              <p className="font-medium">Error al conectar</p>
              <p className="text-red-200">{errorMessage || "Conexión fallida"}</p>
            </div>
          ) : isLoading ? (
            <p>Conectando a servidores MCP...</p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">Herramientas disponibles</p>
              <p className="text-green-200">
                {toolCount} {toolCount === 1 ? "herramienta" : "herramientas"}
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
