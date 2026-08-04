import { useTranslations } from "next-intl";
import {
  findVisionModel,
  modelID,
  modelSupportsVision,
} from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import {
  ArrowUp,
  Image,
  Loader2,
  Paperclip,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { ModelPicker } from "./model-picker";
import { FileChip } from "./file-chip";
import { ModelParams } from "./model-params";
import { ComposerMoreMenu } from "./composer-more-menu";
import { PromptPresetsMenu } from "./prompt-presets-menu";
import { ToolPicker } from "./tool-picker";
import { useAiProvider } from "@/lib/context/ai-provider-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { AI_PROMPT_PRESETS_KEY } from "@/lib/ai/types";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
  attachments?: File[];
  onAttachFiles?: (files: FileList | null) => void;
  onRemoveAttachment?: (index: number) => void;
  temperature?: number | null;
  maxTokens?: number | null;
  onTemperatureChange?: (value: number | null) => void;
  onMaxTokensChange?: (value: number | null) => void;
  systemPromptActive?: boolean;
  onSystemPromptClick?: () => void;
  tokenBadge?: React.ReactNode;
}

export const Textarea = ({
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
  attachments = [],
  onAttachFiles,
  onRemoveAttachment,
  temperature = null,
  maxTokens = null,
  onTemperatureChange,
  onMaxTokensChange,
  systemPromptActive = false,
  onSystemPromptClick,
  tokenBadge,
}: InputProps) => {
  const t = useTranslations("common");
  const tPresets = useTranslations("promptPresets");
  const { customModels } = useAiProvider();
  const isStreaming = status === "streaming" || status === "submitted";
  const [presets, setPresets] = useLocalStorage<string[]>(
    AI_PROMPT_PRESETS_KEY,
    [],
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [visionDismissed, setVisionDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImageAttachment = attachments.some((f) =>
    f.type.startsWith("image/"),
  );
  const visionSuggestionId = findVisionModel(customModels);
  const visionSuggestion = visionSuggestionId
    ? customModels.find((m) => m.id === visionSuggestionId)
    : undefined;
  const showVisionSuggestion =
    hasImageAttachment &&
    !modelSupportsVision(selectedModel, customModels) &&
    !visionDismissed;

  useEffect(() => {
    if (!hasImageAttachment) {
      setVisionDismissed(false);
    }
  }, [hasImageAttachment]);

  const closePresetMenus = () => {
    setDropdownOpen(false);
    setMoreMenuOpen(false);
  };

  const saveCurrentAsPreset = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error(tPresets("emptyInput"));
      return;
    }
    if (presets.includes(trimmed)) {
      toast.info(tPresets("alreadyExists"));
    } else {
      setPresets([...presets, trimmed]);
      toast.success(tPresets("saved"));
    }
    closePresetMenus();
  };

  const selectPreset = (preset: string) => {
    const event = {
      target: { value: preset },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(event);
    closePresetMenus();
  };

  const deletePreset = (preset: string) => {
    setPresets(presets.filter((p) => p !== preset));
  };

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAttachFiles?.(e.target.files);
    e.target.value = "";
  };

  return (
    <div className="flex w-full flex-col rounded-2xl border border-input bg-background/50 dark:bg-muted/50 backdrop-blur-sm transition-[box-shadow] focus-within:ring-2 focus-within:ring-ring/30">
      {showVisionSuggestion && (
        <div className="px-3 pt-3">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300">
            <Image className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {t("visionModelSuggestion")}
            </span>
            {visionSuggestion ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 shrink-0 rounded-full border-indigo-500/30 px-2.5 text-[11px]"
                onClick={() =>
                  setSelectedModel(visionSuggestion.id as modelID)
                }
              >
                {t("switchToVisionModel", {
                  model: visionSuggestion.label,
                })}
              </Button>
            ) : (
              <span className="hidden shrink-0 text-[10px] opacity-80 sm:inline">
                {t("noVisionModelAvailable")}
              </span>
            )}
            <button
              type="button"
              onClick={() => setVisionDismissed(true)}
              className="shrink-0 rounded-full p-1 hover:bg-foreground/10 transition-colors"
              aria-label={t("close")}
              title={t("close")}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((file, i) =>
            file.type.startsWith("image/") ? (
              <div
                key={`${file.name}-${i}`}
                className="relative group/attach h-20 w-20 rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment?.(i)}
                  className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover/attach:opacity-100 transition-opacity"
                  aria-label={t("removeAttachment")}
                  title={t("removeAttachment")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <FileChip
                key={`${file.name}-${i}`}
                filename={file.name}
                fallbackLabel={file.name}
                onRemove={() => onRemoveAttachment?.(i)}
                removeLabel={t("removeAttachment")}
                className="max-w-40 rounded-lg"
              />
            ),
          )}
        </div>
      )}
      <ShadcnTextarea
        className="resize-none border-0 bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0 focus-visible:border-transparent placeholder:text-muted-foreground"
        value={input}
        autoFocus
        placeholder={t("sendAMessage")}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !isLoading && input?.trim()) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <ModelPicker
          setSelectedModel={setSelectedModel}
          selectedModel={selectedModel}
        />
        <ComposerMoreMenu
          open={moreMenuOpen}
          onOpenChange={setMoreMenuOpen}
          systemPromptActive={systemPromptActive}
          onSystemPromptClick={onSystemPromptClick}
          temperature={temperature}
          maxTokens={maxTokens}
          onTemperatureChange={onTemperatureChange}
          onMaxTokensChange={onMaxTokensChange}
          onAttachClick={() => fileInputRef.current?.click()}
          presets={presets}
          onSelectPreset={selectPreset}
          onDeletePreset={deletePreset}
          onSaveCurrent={saveCurrentAsPreset}
          canSaveCurrent={!!input.trim()}
        />
        {onSystemPromptClick && (
          <button
            type="button"
            onClick={onSystemPromptClick}
            className={cn(
              "relative hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors",
              systemPromptActive && "text-primary"
            )}
            aria-label={t("customInstructions")}
            title={t("customInstructions")}
          >
            <Sparkles className="h-4 w-4" />
            {systemPromptActive && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        )}
        <div className="flex-1" />
        {tokenBadge}
        <div className="hidden sm:block">
          <ToolPicker />
        </div>
        <div className="hidden sm:block">
          {onTemperatureChange && onMaxTokensChange && (
            <ModelParams
              temperature={temperature}
              maxTokens={maxTokens}
              onTemperatureChange={onTemperatureChange}
              onMaxTokensChange={onMaxTokensChange}
            />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.txt,.md,.csv,.json"
          className="hidden"
          onChange={handleFilesPicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className={cn(
            "hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors",
            attachments.length > 0 && "text-primary",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label={t("attachFiles")}
          title={t("attachFiles")}
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <div className="hidden sm:block">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                aria-label={tPresets("title")}
                title={tPresets("title")}
              >
                <Tags className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 max-h-80 overflow-y-auto no-scrollbar"
            >
              <PromptPresetsMenu
                presets={presets}
                onSelectPreset={selectPreset}
                onDeletePreset={deletePreset}
                onSaveCurrent={saveCurrentAsPreset}
                canSaveCurrent={!!input.trim()}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          type={isStreaming ? "button" : "submit"}
          onClick={isStreaming ? stop : undefined}
          disabled={!isStreaming && !input?.trim() && attachments.length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200 group"
        >
          {isStreaming ? (
            <>
              <Loader2 className="h-4 w-4 text-primary-foreground animate-spin group-hover:hidden" />
              <X className="h-4 w-4 text-primary-foreground hidden group-hover:block" />
            </>
          ) : (
            <ArrowUp className="h-4 w-4 text-primary-foreground" />
          )}
        </button>
      </div>
    </div>
  );
};

