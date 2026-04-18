"use client";

import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MCPConnectionDiagnosticsProps {
  serverUrl: string;
  serverType: "sse" | "http";
  status?: string;
  errorMessage?: string;
}

export function MCPConnectionDiagnostics({
  serverUrl,
  serverType,
  status,
  errorMessage,
}: MCPConnectionDiagnosticsProps) {
  const isSSE = serverType === "sse";
  const isConnected = status === "connected";
  const hasError = status === "error";

  const getTransportInfo = () => {
    if (isSSE) {
      return {
        name: "Server-Sent Events",
        description:
          "Real-time bidirectional streaming connection for tool execution",
        protocol: "EventSource API",
      };
    }
    return {
      name: "HTTP Streaming",
      description: "RESTful HTTP transport with streaming response support",
      protocol: "HTTP/1.1 with streaming",
    };
  };

  const transportInfo = getTransportInfo();

  const getDiagnosticsContent = () => {
    return (
      <div className="space-y-2 max-w-xs">
        <div className="font-medium">Información de Conexión</div>

        <div className="space-y-1 text-xs">
          <div>
            <span className="text-muted-foreground">Tipo:</span>{" "}
            <span className="font-medium">{transportInfo.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Protocolo:</span>{" "}
            <span className="font-medium">{transportInfo.protocol}</span>
          </div>
          <div>
            <span className="text-muted-foreground">URL:</span>
            <div className="break-all font-mono text-xs text-blue-400 mt-0.5">
              {serverUrl}
            </div>
          </div>

          {isConnected && (
            <div className="mt-2 p-2 bg-green-500/20 rounded border border-green-500/30">
              <div className="flex items-center gap-1 text-green-400">
                <CheckCircle className="h-3 w-3" />
                <span className="text-xs">Conexión establecida</span>
              </div>
              <div className="text-xs text-green-300 mt-1">
                {transportInfo.description}
              </div>
            </div>
          )}

          {hasError && (
            <div className="mt-2 p-2 bg-red-500/20 rounded border border-red-500/30">
              <div className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">Error de conexión</span>
              </div>
              {errorMessage && (
                <div className="text-xs text-red-300 mt-1 break-words">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {isSSE ? "SSE" : "HTTP"}
            </span>
            {isConnected && (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            )}
            {hasError && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            )}
            {!isConnected && !hasError && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {getDiagnosticsContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
