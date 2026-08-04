"use client";

import { useTranslations } from "next-intl";
import { BookmarkPlus, X } from "lucide-react";

interface PromptPresetsMenuProps {
  presets: string[];
  onSelectPreset: (preset: string) => void;
  onDeletePreset: (preset: string) => void;
  onSaveCurrent: () => void;
  canSaveCurrent: boolean;
}

/**
 * List of saved prompt presets. Rendered inside the composer presets dropdown
 * (desktop) and inside a dialog (mobile). Plain elements so it works in both
 * dropdown and dialog contexts.
 */
export function PromptPresetsMenu({
  presets,
  onSelectPreset,
  onDeletePreset,
  onSaveCurrent,
  canSaveCurrent,
}: PromptPresetsMenuProps) {
  const t = useTranslations("promptPresets");

  return (
    <div className="space-y-1">
      <p className="px-2 py-1.5 text-xs text-muted-foreground">
        {t("listLabel")}
      </p>
      {presets.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground/70">
          {t("noPresets")}
        </p>
      ) : (
        presets.map((preset, i) => (
          <div
            key={`${preset}-${i}`}
            className="flex min-w-0 items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
          >
            <button
              type="button"
              onClick={() => onSelectPreset(preset)}
              title={preset}
              className="min-w-0 flex-1 break-words text-left text-sm leading-snug line-clamp-2"
            >
              {preset}
            </button>
            <button
              type="button"
              onClick={() => onDeletePreset(preset)}
              className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-destructive"
              aria-label={t("delete")}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))
      )}
      <div className="-mx-1 my-1 h-px bg-border" />
      <button
        type="button"
        disabled={!canSaveCurrent}
        onClick={onSaveCurrent}
        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <BookmarkPlus className="h-4 w-4" />
        {t("saveCurrent")}
      </button>
    </div>
  );
}
