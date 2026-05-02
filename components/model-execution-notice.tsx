"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { ModelExecutionInfo } from "@/lib/hooks/use-model-execution-info";

interface ModelExecutionNoticeProps {
  info: ModelExecutionInfo | null;
}

export function ModelExecutionNotice({ info }: ModelExecutionNoticeProps) {
  if (!info?.autoSwitched) {
    return null;
  }

  return (
    <div className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          Se cambio automaticamente el modelo de <strong>{info.selectedModel}</strong> a <strong>{info.executionModel}</strong> para mejorar la estabilidad al usar tools.
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Ver detalle del cambio de modelo"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-800/80 hover:text-amber-900"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-left">
            Detectamos fallos recurrentes de tool-calling con el modelo seleccionado y usamos uno mas estable para este turno. Tu seleccion no se cambia de forma permanente.
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
