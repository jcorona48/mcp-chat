"use client";
import { useTranslations } from "next-intl";
import {
  MODELS,
  modelDetails,
  type modelID,
  type ModelInfo,
  defaultModel,
  type PresetModelID,
} from "@/ai/providers";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Zap,
  Info,
  Bolt,
  Code,
  Brain,
  Lightbulb,
  Image,
  Gauge,
  Rocket,
  Bot,
  Star,
  Cog,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAiProvider } from "@/lib/context/ai-provider-context";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import {
  isCustomModelId,
  parseCustomModelId,
  providerDisplayName,
} from "@/lib/ai/types";

interface ModelPickerProps {
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
}

const MAX_RECENT_MODELS = 5;

export const ModelPicker = ({
  selectedModel,
  setSelectedModel,
}: ModelPickerProps) => {
  const t = useTranslations("common");
  const { customModels } = useAiProvider();
  const [hoveredModel, setHoveredModel] = useState<modelID | null>(null);
  const [favoriteModels, setFavoriteModels] = useLocalStorage<string[]>(
    "favorite-models",
    []
  );
  const [recentModels, setRecentModels] = useLocalStorage<string[]>(
    "recent-models",
    []
  );

  const allModelIds = useMemo(() => {
    const customIds = customModels.map((m) => m.id);
    return [...MODELS, ...customIds.filter((id) => !MODELS.includes(id))];
  }, [customModels]);

  // Prune favorite/recent ids that no longer exist (e.g. removed custom models)
  useEffect(() => {
    const valid = new Set(allModelIds);
    const prunedFavorites = favoriteModels.filter((id) => valid.has(id));
    if (prunedFavorites.length !== favoriteModels.length) {
      setFavoriteModels(prunedFavorites);
    }
    const prunedRecents = recentModels.filter((id) => valid.has(id));
    if (prunedRecents.length !== recentModels.length) {
      setRecentModels(prunedRecents);
    }
  }, [
    allModelIds,
    favoriteModels,
    recentModels,
    setFavoriteModels,
    setRecentModels,
  ]);

  const validModelId = allModelIds.includes(selectedModel)
    ? selectedModel
    : defaultModel;

  useEffect(() => {
    if (selectedModel !== validModelId) {
      setSelectedModel(validModelId as modelID);
    }
  }, [selectedModel, validModelId, setSelectedModel]);

  const getModelInfo = (id: string): ModelInfo => {
    const preset = modelDetails[id as PresetModelID];
    if (preset) return preset;

    const parsed = parseCustomModelId(id);
    const def = customModels.find((m) => m.id === id);
    if (parsed) {
      return {
        provider: providerDisplayName(parsed.provider),
        providerKey: parsed.provider,
        name: def?.label || parsed.providerModelId,
        description:
          def?.baseURL ? `${t("baseUrl")}: ${def.baseURL}` : "",
        apiVersion: parsed.providerModelId,
        providerModelId: parsed.providerModelId,
        capabilities: ["Custom"],
      };
    }

    return modelDetails[defaultModel as PresetModelID];
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "anthropic":
        return <Sparkles className="h-3 w-3 text-orange-600" />;
      case "openai":
        return <Zap className="h-3 w-3 text-green-500" />;
      case "google":
        return <Zap className="h-3 w-3 text-red-500" />;
      case "groq":
        return <Sparkles className="h-3 w-3 text-blue-500" />;
      case "xai":
        return <Sparkles className="h-3 w-3 text-yellow-500" />;
      case "llm7":
        return <Sparkles className="h-3 w-3 text-teal-500" />;
      default:
        return <Info className="h-3 w-3 text-blue-500" />;
    }
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability.toLowerCase()) {
      case "code":
        return <Code className="h-2.5 w-2.5" />;
      case "reasoning":
        return <Brain className="h-2.5 w-2.5" />;
      case "research":
        return <Lightbulb className="h-2.5 w-2.5" />;
      case "vision":
        return <Image className="h-2.5 w-2.5" />;
      case "fast":
      case "rapid":
        return <Bolt className="h-2.5 w-2.5" />;
      case "efficient":
      case "compact":
        return <Gauge className="h-2.5 w-2.5" />;
      case "creative":
      case "balance":
        return <Rocket className="h-2.5 w-2.5" />;
      case "agentic":
        return <Bot className="h-2.5 w-2.5" />;
      default:
        return <Info className="h-2.5 w-2.5" />;
    }
  };

  const getCapabilityColor = (capability: string) => {
    switch (capability.toLowerCase()) {
      case "code":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "reasoning":
      case "research":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "vision":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "fast":
      case "rapid":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "efficient":
      case "compact":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "creative":
      case "balance":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
      case "agentic":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const toggleFavorite = (modelId: string) => {
    setFavoriteModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const favoriteSet = useMemo(
    () => new Set(favoriteModels),
    [favoriteModels]
  );
  const recentSet = useMemo(() => new Set(recentModels), [recentModels]);
  const favoriteIds = allModelIds.filter((id) => favoriteSet.has(id));
  const recentIds = allModelIds.filter(
    (id) => !favoriteSet.has(id) && recentSet.has(id)
  );
  const restIds = allModelIds.filter(
    (id) => !favoriteSet.has(id) && !recentSet.has(id)
  );
  const hasFavorites = favoriteIds.length > 0;
  const hasRecents = recentIds.length > 0;

  const displayModelId = hoveredModel || validModelId;
  const currentModelDetails = getModelInfo(displayModelId);
  const isCurrentFavorite = favoriteSet.has(displayModelId);

  const renderModelRow = (id: string) => {
    const info = getModelInfo(id);
    const isCustom = isCustomModelId(id);
    const isFavorite = favoriteSet.has(id);
    return (
      <SelectItem
        key={id}
        value={id}
        onMouseEnter={() => setHoveredModel(id as modelID)}
        onMouseLeave={() => setHoveredModel(null)}
        className={cn(
          "!px-2 sm:!px-3 py-1.5 sm:py-2 cursor-pointer rounded-md text-xs transition-colors duration-150 group/item",
          "hover:bg-primary/5 hover:text-primary-foreground",
          "focus:bg-primary/10 focus:text-primary focus:outline-none",
          "data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
          "min-w-0 *:[span]:last:min-w-0 *:[span]:last:flex-1",
          validModelId === id &&
            "!bg-primary/15 !text-primary font-medium"
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {getProviderIcon(info.provider)}
            <span className="min-w-0 flex-1 font-medium truncate">
              {info.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={(e) => e.stopPropagation()}
              className={cn(
                "shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full transition-colors",
                isFavorite
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-muted-foreground/50 opacity-0 group-hover/item:opacity-100 hover:text-amber-500 pointer-events-none group-hover/item:pointer-events-auto"
              )}
              title={isFavorite ? t("removeFavorite") : t("addFavorite")}
              aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
            >
              <Star className={cn("h-3 w-3", isFavorite && "fill-current")} />
            </button>
            {isCustom && (
              <span
                title={t("custom")}
                className="ml-auto shrink-0 inline-flex items-center justify-center gap-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                <Cog className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {info.provider}
          </span>
        </div>
      </SelectItem>
    );
  };

  const handleModelChange = (modelId: string) => {
    if (allModelIds.includes(modelId)) {
      setSelectedModel(modelId as modelID);
      setRecentModels((prev) =>
        [modelId, ...prev.filter((id) => id !== modelId)].slice(
          0,
          MAX_RECENT_MODELS
        )
      );
    }
  };

  return (
    <div className="relative z-10">
      <Select
        value={validModelId}
        onValueChange={handleModelChange}
        defaultValue={validModelId}
      >
        <SelectTrigger className="max-w-[200px] sm:max-w-fit sm:w-56 px-2 sm:px-3 h-8 sm:h-9 rounded-full group border-primary/20 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 ring-offset-background focus:ring-2 focus:ring-primary/30 focus:ring-offset-2">
          <SelectValue
            placeholder={t("selectModel")}
            className="text-xs font-medium flex items-center gap-1 sm:gap-2 text-primary dark:text-primary-foreground"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              {getProviderIcon(getModelInfo(validModelId).provider)}
              <span className="font-medium truncate">
                {getModelInfo(validModelId).name}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="bg-background/95 dark:bg-muted/95 backdrop-blur-sm border-border/80 rounded-lg overflow-hidden p-0 w-[280px] sm:w-[350px] md:w-[515px]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] md:grid-cols-[200px_minmax(0,1fr)] items-start">
            <div className="sm:border-r border-border/40 bg-muted/20 p-0 pr-1 max-h-[320px] overflow-y-auto min-w-0">
              <SelectGroup className="space-y-1">
                {hasFavorites && (
                  <>
                    <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-2 pt-2.5 pb-0">
                      {t("favorites")}
                    </SelectLabel>
                    {favoriteIds.map(renderModelRow)}
                  </>
                )}
                {hasRecents && (
                  <>
                    <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-2 pt-2.5 pb-0">
                      {t("recentModels")}
                    </SelectLabel>
                    {recentIds.map(renderModelRow)}
                  </>
                )}
                {restIds.map(renderModelRow)}
              </SelectGroup>
            </div>

            <div className="sm:block hidden p-2 sm:p-3 md:p-4 flex-col min-w-0 h-[320px] overflow-y-auto no-scrollbar">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getProviderIcon(currentModelDetails.provider)}
                  <h3 className="min-w-0 flex-1 text-sm font-semibold truncate">
                    {currentModelDetails.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(displayModelId)}
                    className={cn(
                      "shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors",
                      isCurrentFavorite
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-muted-foreground/50 hover:text-amber-500"
                    )}
                    title={
                      isCurrentFavorite
                        ? t("removeFavorite")
                        : t("addFavorite")
                    }
                    aria-label={
                      isCurrentFavorite
                        ? t("removeFavorite")
                        : t("addFavorite")
                    }
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        isCurrentFavorite && "fill-current"
                      )}
                    />
                  </button>
                  {isCustomModelId(displayModelId) && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Cog className="h-2.5 w-2.5" />
                      {t("custom")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("provider")}:{" "}
                  <span className="font-medium">
                    {currentModelDetails.provider}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2 mb-3">
                  {currentModelDetails.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className={cn(
                        "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        getCapabilityColor(capability)
                      )}
                    >
                      {getCapabilityIcon(capability)}
                      <span>{capability}</span>
                    </span>
                  ))}
                </div>

                <div className="text-xs text-foreground/90 leading-relaxed mb-3 hidden md:block">
                  {currentModelDetails.description}
                </div>
              </div>

              <div className="bg-muted/40 rounded-md p-2 hidden md:block">
                <div className="text-[10px] text-muted-foreground flex justify-between items-center gap-2">
                  <span>{t("apiVersion")}:</span>
                  <code className="bg-background/80 px-2 py-0.5 rounded text-[10px] font-mono min-w-0 break-all">
                    {currentModelDetails.apiVersion}
                  </code>
                </div>
              </div>
            </div>

            <div className="p-3 sm:hidden border-t border-border/30">
              <div className="flex flex-wrap gap-1 mb-2">
                {currentModelDetails.capabilities
                  .slice(0, 4)
                  .map((capability) => (
                    <span
                      key={capability}
                      className={cn(
                        "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        getCapabilityColor(capability)
                      )}
                    >
                      {getCapabilityIcon(capability)}
                      <span>{capability}</span>
                    </span>
                  ))}
                {currentModelDetails.capabilities.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{currentModelDetails.capabilities.length - 4} {t("more")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};
