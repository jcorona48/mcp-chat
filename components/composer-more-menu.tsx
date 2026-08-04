"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  Hash,
  MoreHorizontal,
  Paperclip,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Wrench,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModelParamsControls } from "./model-params";
import { PromptPresetsMenu } from "./prompt-presets-menu";
import { TokenBreakdown, type UsageMessage } from "./token-badge";
import { ToolPickerContent } from "./tool-picker";
import { type TokenUsage } from "@/lib/chat/usage";
import { cn } from "@/lib/utils";

interface ComposerMoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPromptActive?: boolean;
  onSystemPromptClick?: () => void;
  temperature?: number | null;
  maxTokens?: number | null;
  onTemperatureChange?: (value: number | null) => void;
  onMaxTokensChange?: (value: number | null) => void;
  onAttachClick?: () => void;
  presets: string[];
  onSelectPreset: (preset: string) => void;
  onDeletePreset: (preset: string) => void;
  onSaveCurrent: () => void;
  canSaveCurrent: boolean;
  usage?: TokenUsage | null;
  messages?: UsageMessage[] | null;
}

/**
 * Mobile-only "more" menu of the composer. Groups every composer action except
 * send and model switching (see Textarea). Items with large content open a
 * dialog instead of a submenu, which overflows the viewport on small screens.
 */
export function ComposerMoreMenu({
  open,
  onOpenChange,
  systemPromptActive = false,
  onSystemPromptClick,
  temperature = null,
  maxTokens = null,
  onTemperatureChange,
  onMaxTokensChange,
  onAttachClick,
  presets,
  onSelectPreset,
  onDeletePreset,
  onSaveCurrent,
  canSaveCurrent,
  usage,
  messages,
}: ComposerMoreMenuProps) {
  const t = useTranslations("common");
  const tPresets = useTranslations("promptPresets");
  const tModelParams = useTranslations("modelParams");
  const tChat = useTranslations("chat");
  const tTools = useTranslations("toolPicker");

  const [paramsOpen, setParamsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            aria-label={t("moreActions")}
            title={t("moreActions")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-64">
          {onSystemPromptClick && (
            <DropdownMenuItem
              onSelect={() => {
                onSystemPromptClick();
              }}
            >
              <Sparkles className={cn(systemPromptActive && "text-primary")} />
              {t("customInstructions")}
            </DropdownMenuItem>
          )}
          {onTemperatureChange && onMaxTokensChange && (
            <DropdownMenuItem onSelect={() => setParamsOpen(true)}>
              <SlidersHorizontal />
              {tModelParams("title")}
              <ChevronRight className="ml-auto size-4 text-muted-foreground/50" />
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              onAttachClick?.();
            }}
          >
            <Paperclip />
            {t("attachFiles")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPresetsOpen(true)}>
            <Tags />
            {tPresets("title")}
            <ChevronRight className="ml-auto size-4 text-muted-foreground/50" />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setToolsOpen(true)}>
            <Wrench />
            {tTools("title")}
            <ChevronRight className="ml-auto size-4 text-muted-foreground/50" />
          </DropdownMenuItem>
          {usage && usage.totalTokens > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setTokensOpen(true)}>
                <Hash />
                {tChat("tokens")}
                <ChevronRight className="ml-auto size-4 text-muted-foreground/50" />
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={toolsOpen} onOpenChange={setToolsOpen}>
        <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{tTools("title")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
            <ToolPickerContent />
          </div>
        </DialogContent>
      </Dialog>

      {onTemperatureChange && onMaxTokensChange && (
        <Dialog open={paramsOpen} onOpenChange={setParamsOpen}>
          <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{tModelParams("title")}</DialogTitle>
            </DialogHeader>
            <ModelParamsControls
              temperature={temperature}
              maxTokens={maxTokens}
              onTemperatureChange={onTemperatureChange}
              onMaxTokensChange={onMaxTokensChange}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={presetsOpen} onOpenChange={setPresetsOpen}>
        <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{tPresets("title")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
            <PromptPresetsMenu
              presets={presets}
              onSelectPreset={(preset) => {
                onSelectPreset(preset);
                setPresetsOpen(false);
              }}
              onDeletePreset={onDeletePreset}
              onSaveCurrent={() => {
                onSaveCurrent();
                setPresetsOpen(false);
              }}
              canSaveCurrent={canSaveCurrent}
            />
          </div>
        </DialogContent>
      </Dialog>

      {usage && usage.totalTokens > 0 && (
        <Dialog open={tokensOpen} onOpenChange={setTokensOpen}>
          <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{tChat("tokens")}</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
              <TokenBreakdown usage={usage} messages={messages} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
