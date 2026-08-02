"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  Zap,
  Sparkles,
  Globe,
  Orbit,
  ServerIcon,
  type LucideIcon,
} from "lucide-react";
import { useAiProvider } from "@/lib/context/ai-provider-context";
import { ModelSearchList } from "@/components/model-search-list";
import {
  KNOWN_PROVIDERS,
  customModelId,
  isKeylessProvider,
  providerDisplayName,
  type ApiKeyMap,
  type CustomModelDef,
  type KnownProviderKey,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

interface DiscoveredModel {
  id: string;
  name?: string;
  tools?: boolean;
  vision?: boolean;
}

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  openai: Zap,
  anthropic: Sparkles,
  google: Globe,
  groq: Zap,
  xai: Sparkles,
  openrouter: Orbit,
  llm7: Sparkles,
};

interface AiProviderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiProviderManager({
  open,
  onOpenChange,
}: AiProviderManagerProps) {
  const t = useTranslations("aiProvider");
  const tCommon = useTranslations("common");
  const {
    apiKeys,
    setApiKeys,
    customModels,
    setCustomModels,
    toggleCustomModel,
    hasCustomModel,
  } = useAiProvider();

  const [draftKeys, setDraftKeys] = useState<ApiKeyMap>({});
  const [discovered, setDiscovered] = useState<
    Record<string, DiscoveredModel[]>
  >({});
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState({
    slug: "",
    baseURL: "",
    apiKey: "",
  });
  const [manualDraft, setManualDraft] = useState({
    provider: "openai" as string,
    modelId: "",
    label: "",
    baseURL: "",
  });

  useEffect(() => {
    if (open) {
      setDraftKeys({ ...apiKeys });
      const firstCustom = customModels.find(
        (m) => !KNOWN_PROVIDERS.includes(m.provider as KnownProviderKey)
      );
      if (firstCustom && !customDraft.slug) {
        setCustomDraft((prev) => ({
          ...prev,
          slug: firstCustom.provider,
          baseURL: firstCustom.baseURL ?? "",
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apiKeys]);

  const customSlugs = Object.keys(apiKeys).filter(
    (k) => !KNOWN_PROVIDERS.includes(k as KnownProviderKey)
  );
  const manualProviders = [...KNOWN_PROVIDERS, ...customSlugs];

  const isKnownProvider = (provider: string) =>
    KNOWN_PROVIDERS.includes(provider as KnownProviderKey);

  const handleSaveKeys = () => {
    setApiKeys({ ...draftKeys });
    toast.success(t("keysSaved"));
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setDraftKeys({});
    setApiKeys({});
    setCustomModels([]);
    setDiscovered({});
    setCustomDraft({ slug: "", baseURL: "", apiKey: "" });
    toast.success(t("allKeysCleared"));
  };

  const handleLoadModels = async (provider: string) => {
    const isCustom = !isKnownProvider(provider);
    const keyless = isKeylessProvider(provider);
    const key =
      (provider === customDraft.slug ? customDraft.apiKey : undefined) ??
      draftKeys[provider]?.trim();
    const baseURL =
      provider === customDraft.slug ? customDraft.baseURL.trim() : undefined;

    if (isCustom && !provider) return;
    if (isCustom && !baseURL) {
      toast.error(t("baseUrlRequired"));
      return;
    }

    setLoadingProvider(provider);
    setLoadError(null);
    try {
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          baseURL,
          apiKey: keyless ? (key || undefined) : key || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.models)) {
        setDiscovered((prev) => ({ ...prev, [provider]: data.models }));
        if (data.models.length === 0) {
          toast.info(t("noModelsFound"));
        }
      } else {
        const message = data.error ?? t("failedToLoadModels");
        setLoadError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleToggleModel = (
    provider: string,
    model: DiscoveredModel,
    enabled: boolean
  ) => {
    const def: CustomModelDef = {
      id: customModelId(provider, model.id),
      provider,
      providerModelId: model.id,
      label: model.name ?? model.id,
      baseURL:
        provider === customDraft.slug ? customDraft.baseURL.trim() : undefined,
    };
    toggleCustomModel(def, enabled);
  };

  const handleAddManual = () => {
    const provider = manualDraft.provider;
    const modelId = manualDraft.modelId.trim();
    if (!provider || !modelId) return;

    const isCustom = !isKnownProvider(provider);
    const baseURL = isCustom ? manualDraft.baseURL.trim() : undefined;
    if (isCustom && !baseURL) {
      toast.error(t("baseUrlRequired"));
      return;
    }

    const def: CustomModelDef = {
      id: customModelId(provider, modelId),
      provider,
      providerModelId: modelId,
      label: manualDraft.label.trim() || modelId,
      baseURL,
    };
    toggleCustomModel(def, true);
    setManualDraft({ provider, modelId: "", label: "", baseURL: "" });
  };

  const renderProviderSection = (provider: string, isCustom: boolean) => {
    const Icon = PROVIDER_ICONS[provider] ?? ServerIcon;
    const providerDiscovered = discovered[provider];
    const isLoading = loadingProvider === provider;

    return (
      <div key={provider} className="rounded-md border border-border/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium truncate">
              {providerDisplayName(provider)}
              {isCustom && (
                <Badge variant="secondary" className="ml-2 text-[9px]">
                  {t("custom")}
                </Badge>
              )}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs shrink-0"
            onClick={() => handleLoadModels(provider)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : providerDiscovered ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {t("loadModels")}
          </Button>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="grid gap-1.5">
            <Label className="text-[10px] text-muted-foreground">
              {t("apiKey")}
              {isKeylessProvider(provider) && (
                <span className="ml-1 font-normal opacity-70">
                  ({t("optional")})
                </span>
              )}
            </Label>
            <Input
              type="password"
              value={draftKeys[provider] ?? ""}
              onChange={(e) =>
                setDraftKeys((prev) => ({
                  ...prev,
                  [provider]: e.target.value,
                }))
              }
              placeholder={
                isKeylessProvider(provider)
                  ? t("keylessPlaceholder")
                  : t("apiKeyPlaceholder")
              }
              className="h-8 text-xs"
            />
          </div>
          {isKeylessProvider(provider) && (
            <p className="text-[11px] text-muted-foreground">
              {t("keylessProvider")}
            </p>
          )}
          {isCustom && (
            <div className="grid gap-1.5">
              <Label className="text-[10px] text-muted-foreground">
                {t("baseUrl")}
              </Label>
              <Input
                type="url"
                value={customDraft.baseURL}
                onChange={(e) =>
                  setCustomDraft((prev) => ({
                    ...prev,
                    baseURL: e.target.value,
                  }))
                }
                placeholder="https://my-vllm.example.com/v1"
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {loadError && loadingProvider === provider && (
          <p className="mt-2 text-xs text-destructive">{loadError}</p>
        )}

        {providerDiscovered && providerDiscovered.length > 0 && (
          <div className="mt-3">
            <ModelSearchList
              models={providerDiscovered}
              resetKey={provider}
              keyOf={(m) => m.id}
              searchTextOf={(m) => `${m.name ?? ""} ${m.id}`}
              toolsOf={(m) => m.tools !== false}
              visionOf={(m) => m.vision === true}
              renderRow={(model) => {
                const id = customModelId(provider, model.id);
                const checked = hasCustomModel(id);
                return (
                  <label className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        handleToggleModel(provider, model, e.target.checked)
                      }
                      className="accent-primary h-3.5 w-3.5"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {model.name ?? model.id}
                    </span>
                    <code className="shrink-0 truncate font-mono text-[10px] text-muted-foreground max-w-40">
                      {model.id}
                    </code>
                  </label>
                );
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t("enabledModels")}
              {customModels.length > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground/70">
                  ({customModels.length})
                </span>
              )}
            </Label>
            {customModels.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("noModelsEnabled")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {customModels.map((model) => (
                  <span
                    key={model.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 py-1 pl-2.5 pr-1 text-xs"
                  >
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[9px]"
                    >
                      {providerDisplayName(model.provider)}
                    </Badge>
                    <span className="max-w-56 truncate font-medium">
                      {model.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCustomModel(model, false)}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      aria-label={model.label}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {KNOWN_PROVIDERS.map((provider) =>
              renderProviderSection(provider, false)
            )}

            <div className="rounded-md border border-border/50 p-3">
              <div className="flex items-center gap-2">
                <ServerIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium">
                  {t("customProvider")}
                  <Badge variant="secondary" className="ml-2 text-[9px]">
                    {t("openAICompatible")}
                  </Badge>
                </span>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("providerName")}
                  </Label>
                  <Input
                    value={customDraft.slug}
                    onChange={(e) => {
                      const next = e.target.value.trim().replace(/\s+/g, "-");
                      setCustomDraft((prev) => {
                        const key = prev.apiKey;
                        if (prev.slug && next !== prev.slug) {
                          setDraftKeys((keys) => {
                            const updated = { ...keys };
                            delete updated[prev.slug];
                            if (key) updated[next] = key;
                            return updated;
                          });
                        }
                        return { ...prev, slug: next };
                      });
                    }}
                    placeholder="vllm"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("baseUrl")}
                  </Label>
                  <Input
                    type="url"
                    value={customDraft.baseURL}
                    onChange={(e) =>
                      setCustomDraft((prev) => ({
                        ...prev,
                        baseURL: e.target.value,
                      }))
                    }
                    placeholder="https://my-vllm.example.com/v1"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("apiKey")}
                  </Label>
                  <Input
                    type="password"
                    value={customDraft.apiKey}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomDraft((prev) => ({
                        ...prev,
                        apiKey: value,
                      }));
                      if (customDraft.slug) {
                        setDraftKeys((prev) => ({
                          ...prev,
                          [customDraft.slug]: value,
                        }));
                      }
                    }}
                    placeholder={t("apiKeyPlaceholder")}
                    className="h-8 text-xs"
                  />
                </div>

                {customDraft.slug && (
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px]">{customDraft.slug}</Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() =>
                          handleLoadModels(customDraft.slug)
                        }
                        disabled={loadingProvider === customDraft.slug}
                      >
                        {loadingProvider === customDraft.slug ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Globe className="h-3.5 w-3.5" />
                        )}
                        {t("loadModels")}
                      </Button>
                    </div>
                    {loadError && loadingProvider === customDraft.slug && (
                      <p className="text-xs text-destructive">{loadError}</p>
                    )}
                    {discovered[customDraft.slug] &&
                      discovered[customDraft.slug].length > 0 && (
                        <div>
                          <ModelSearchList
                            models={discovered[customDraft.slug]}
                            resetKey={customDraft.slug}
                            keyOf={(m) => m.id}
                            searchTextOf={(m) => `${m.name ?? ""} ${m.id}`}
                            toolsOf={(m) => m.tools !== false}
              visionOf={(m) => m.vision === true}
                            renderRow={(model) => {
                              const id = customModelId(customDraft.slug, model.id);
                              const checked = hasCustomModel(id);
                              return (
                                <label className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      handleToggleModel(
                                        customDraft.slug,
                                        model,
                                        e.target.checked
                                      )
                                    }
                                    className="accent-primary h-3.5 w-3.5"
                                  />
                                  <span className="min-w-0 flex-1 truncate font-medium">
                                    {model.name ?? model.id}
                                  </span>
                                  <code className="shrink-0 truncate font-mono text-[10px] text-muted-foreground max-w-40">
                                    {model.id}
                                  </code>
                                </label>
                              );
                            }}
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border/50 p-3">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t("addManually")}
            </Label>
            <div className="mt-2 grid gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("provider")}
                  </Label>
                  <select
                    value={manualDraft.provider}
                    onChange={(e) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        provider: e.target.value,
                      }))
                    }
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    {manualProviders.map((p) => (
                      <option key={p} value={p}>
                        {providerDisplayName(p)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("modelId")}
                  </Label>
                  <Input
                    value={manualDraft.modelId}
                    onChange={(e) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        modelId: e.target.value,
                      }))
                    }
                    placeholder="model-id"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("label")}
                  </Label>
                  <Input
                    value={manualDraft.label}
                    onChange={(e) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    placeholder={t("labelOptional")}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {!isKnownProvider(manualDraft.provider) && (
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("baseUrl")}
                  </Label>
                  <Input
                    type="url"
                    value={manualDraft.baseURL}
                    onChange={(e) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        baseURL: e.target.value,
                      }))
                    }
                    placeholder="https://my-vllm.example.com/v1"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 justify-self-start text-xs"
                onClick={handleAddManual}
                disabled={!manualDraft.provider || !manualDraft.modelId.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addModel")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleClearAll}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t("clearAllKeys")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSaveKeys}>
              <KeyRound className="h-4 w-4 mr-1.5" />
              {t("saveKeys")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
