"use client";

import { useTranslations } from "next-intl";
import { Check, Palette, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ACCENT_OPTIONS,
  hueToHex,
  hexToHue,
  useAccent,
} from "./accent-provider";

export function PaletteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("theme");
  const { hue, accentKey, setAccentKey, setHue, resetAccent } = useAccent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t("palette")}
          </DialogTitle>
          <DialogDescription>{t("paletteDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              {t("accent")}
            </Label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {ACCENT_OPTIONS.map((option) => {
                const active = option.key === accentKey;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAccentKey(option.key)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110",
                      active &&
                        "ring-2 ring-offset-2 ring-offset-background ring-ring"
                    )}
                    style={{ backgroundColor: `oklch(0.55 0.16 ${option.hue})` }}
                    aria-label={t(`accent${option.key[0].toUpperCase()}${option.key.slice(1)}`)}
                    title={t(`accent${option.key[0].toUpperCase()}${option.key.slice(1)}`)}
                  >
                    {active && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">
                {t("customColor")}
              </Label>
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2">
                <input
                  type="color"
                  value={hueToHex(hue)}
                  onChange={(e) => setHue(hexToHue(e.target.value))}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                  aria-label={t("customColor")}
                />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={Math.round(hue)}
                    onChange={(e) => setHue(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-[color:var(--primary)]"
                    aria-label={t("hue")}
                  />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {Math.round(hue)}°
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetAccent}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("reset")}
            </Button>
            <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
              {t("done")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
