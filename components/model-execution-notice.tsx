"use client";

import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { ModelExecutionInfo } from "@/lib/hooks/use-model-execution-info";

interface ModelExecutionNoticeProps {
  info: ModelExecutionInfo | null;
}

export function ModelExecutionNotice({ info }: ModelExecutionNoticeProps) {
  const t = useTranslations("modelExecution");
  if (!info?.autoSwitched) {
    return null;
  }

  return (
    <div className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {t.rich("autoSwitched", {
            selectedModel: info.selectedModel,
            executionModel: info.executionModel,
            strong: (children) => <strong>{children}</strong>,
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("detailAriaLabel")}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-800/80 hover:text-amber-900"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-left">
            {t("detailTooltip")}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
