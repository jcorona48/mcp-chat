"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  FilterX,
  Image,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelSearchListProps<T> {
  models: T[];
  resetKey?: string;
  keyOf: (model: T) => string;
  searchTextOf: (model: T) => string;
  renderRow: (model: T) => React.ReactNode;
  placeholder?: string;
  emptyText?: string;
  maxHeightClass?: string;
  limitOptions?: number[];
  defaultLimit?: number;
  toolsOf?: (model: T) => boolean;
  visionOf?: (model: T) => boolean;
}

export function ModelSearchList<T>({
  models,
  resetKey,
  keyOf,
  searchTextOf,
  renderRow,
  placeholder,
  emptyText,
  maxHeightClass = "max-h-56",
  limitOptions = [25, 50, 100, 0],
  defaultLimit = 50,
  toolsOf,
  visionOf,
}: ModelSearchListProps<T>) {
  const t = useTranslations("common");
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [toolsOnly, setToolsOnly] = useState(false);
  const [visionOnly, setVisionOnly] = useState(false);
  const [limit, setLimit] = useState<number>(defaultLimit);

  useEffect(() => {
    setQuery("");
    setFreeOnly(false);
    setToolsOnly(false);
    setVisionOnly(false);
    setLimit(defaultLimit);
  }, [resetKey, defaultLimit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = models.filter((model) => {
      const searchText = searchTextOf(model).toLowerCase();
      if (q && !searchText.includes(q)) return false;
      if (freeOnly && !/(^|[/:. -])free([/:. -]|$)/.test(searchText)) {
        return false;
      }
      if (toolsOnly && toolsOf && !toolsOf(model)) {
        return false;
      }
      if (visionOnly && visionOf && !visionOf(model)) {
        return false;
      }
      return true;
    });
    return limit > 0 ? result.slice(0, limit) : result;
  }, [models, query, freeOnly, toolsOnly, visionOnly, limit, searchTextOf, toolsOf, visionOf]);

  const filters: {
    key: string;
    label: string;
    icon: LucideIcon;
    active: boolean;
    toggle: () => void;
  }[] = [
    {
      key: "free",
      label: t("free"),
      icon: Sparkles,
      active: freeOnly,
      toggle: () => setFreeOnly((v) => !v),
    },
    ...(toolsOf
      ? [
          {
            key: "tools",
            label: t("tools"),
            icon: Wrench,
            active: toolsOnly,
            toggle: () => setToolsOnly((v) => !v),
          },
        ]
      : []),
    ...(visionOf
      ? [
          {
            key: "vision",
            label: t("vision"),
            icon: Image,
            active: visionOnly,
            toggle: () => setVisionOnly((v) => !v),
          },
        ]
      : []),
  ];

  const activeFilterCount = filters.filter((f) => f.active).length;

  const clearFilters = () => {
    setFreeOnly(false);
    setToolsOnly(false);
    setVisionOnly(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? t("searchModels")}
            className="h-8 pl-7 pr-8 text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 shrink-0 gap-1.5 px-2.5 text-xs",
                activeFilterCount > 0 && "border-primary/40 bg-primary/5"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("filters")}</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 rounded-lg p-1.5">
            <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {t("filters")}
            </div>
            <div className="space-y-0.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.toggle}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-foreground/80 hover:bg-muted/60 transition-colors"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      f.active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background"
                    )}
                  >
                    {f.active && <Check className="h-3 w-3" />}
                  </span>
                  <f.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-left">{f.label}</span>
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                <FilterX className="h-3.5 w-3.5 shrink-0" />
                {t("clearFilters")}
              </button>
            )}
          </PopoverContent>
        </Popover>
        <select
          value={String(limit)}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-8 w-[70px] shrink-0 rounded-md border border-input bg-background px-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("resultLimit")}
        >
          {limitOptions.map((opt) => (
            <option key={opt} value={String(opt)}>
              {opt === 0 ? t("all") : opt}
            </option>
          ))}
        </select>
      </div>

      <div
        className={cn(
          "mt-2 overflow-y-auto rounded-md border border-border/40 bg-muted/20 p-2",
          maxHeightClass
        )}
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            {emptyText ?? t("noModelsMatch")}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((model) => (
              <div key={keyOf(model)}>{renderRow(model)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
