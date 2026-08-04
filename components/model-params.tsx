"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModelParamsProps {
  temperature: number | null;
  maxTokens: number | null;
  onTemperatureChange: (value: number | null) => void;
  onMaxTokensChange: (value: number | null) => void;
}

const DEFAULT_TEMPERATURE = 1;
const DEFAULT_MAX_TOKENS = 4096;

interface Preset {
  id: "auto" | "precise" | "creative";
  temperature: number | null;
  maxTokens: number | null;
}

/**
 * Shared body of the model params UI. Rendered inside the ModelParams popover
 * (desktop) and inside the composer "more" submenu (mobile).
 */
export const ModelParamsControls = ({
  temperature,
  maxTokens,
  onTemperatureChange,
  onMaxTokensChange,
}: ModelParamsProps) => {
  const t = useTranslations("modelParams");

  const presets: (Preset & { label: string })[] = [
    { id: "auto", temperature: null, maxTokens: null, label: t("auto") },
    {
      id: "precise",
      temperature: 0.2,
      maxTokens: null,
      label: t("presetPrecise"),
    },
    {
      id: "creative",
      temperature: 1.3,
      maxTokens: 8192,
      label: t("presetCreative"),
    },
  ];

  const hasCustomParams = temperature !== null || maxTokens !== null;

  const reset = () => {
    onTemperatureChange(null);
    onMaxTokensChange(null);
  };

  const applyPreset = (preset: Preset) => {
    onTemperatureChange(preset.temperature);
    onMaxTokensChange(preset.maxTokens);
  };

  const isPresetActive = (preset: Preset) =>
    temperature === preset.temperature && maxTokens === preset.maxTokens;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{t("title")}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={reset}
          disabled={!hasCustomParams}
          title={t("reset")}
          aria-label={t("reset")}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-2">
          {t("presets")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border",
                isPresetActive(preset)
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 border-border"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/80">{t("temperature")}</span>
            <span className="text-muted-foreground font-mono">
              {temperature === null ? "Auto" : temperature.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature ?? DEFAULT_TEMPERATURE}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onTemperatureChange(null)}
            >
              {t("auto")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground/80">{t("maxTokens")}</span>
            <span className="text-muted-foreground font-mono">
              {maxTokens === null ? "Auto" : maxTokens.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={256}
              max={16384}
              step={128}
              value={maxTokens ?? DEFAULT_MAX_TOKENS}
              onChange={(e) => onMaxTokensChange(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onMaxTokensChange(null)}
            >
              {t("auto")}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70 leading-snug pt-1">
          {t("hint")}
        </p>
      </div>
    </>
  );
};

export const ModelParams = ({
  temperature,
  maxTokens,
  onTemperatureChange,
  onMaxTokensChange,
}: ModelParamsProps) => {
  const t = useTranslations("modelParams");
  const [open, setOpen] = useState(false);

  const hasCustomParams = temperature !== null || maxTokens !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors",
            hasCustomParams && "text-primary"
          )}
          aria-label={t("title")}
          title={t("title")}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 rounded-lg">
        <ModelParamsControls
          temperature={temperature}
          maxTokens={maxTokens}
          onTemperatureChange={onTemperatureChange}
          onMaxTokensChange={onMaxTokensChange}
        />
      </PopoverContent>
    </Popover>
  );
};
