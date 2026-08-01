"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CheckCircle2, Globe, Loader2, Pencil, Plus, ServerIcon, X } from "lucide-react";
import { useMCP, type KeyValuePair, type MCPServer } from "@/lib/context/mcp-context";
import {
  ADD_MCP_SERVER_TOOL,
  type ProposedMcpServer,
} from "@/lib/chat/ai-config-tools";

interface DraftServer {
  name: string;
  url: string;
  type: "http" | "sse";
  headers: KeyValuePair[];
}

export function ToolConfigApply({ result }: { result: unknown }) {
  const t = useTranslations("mcp");
  const {
    mcpServers,
    setMcpServers,
    selectedMcpServers,
    setSelectedMcpServers,
    startServer,
  } = useMCP();
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftServer | null>(null);

  const proposed = extractProposedServer(result);
  const existing = proposed
    ? mcpServers.find(
        (s) =>
          s.id === proposed.id ||
          s.name === proposed.name ||
          s.url === proposed.url
      )
    : undefined;
  const isExactMatch =
    !!existing &&
    !!proposed &&
    existing.type === proposed.type &&
    headersEqual(existing.headers ?? [], proposed.headers ?? []);

  if (!proposed) return null;

  const startEdit = () => {
    setDraft({
      name: proposed.name,
      url: proposed.url,
      type: proposed.type,
      headers: (proposed.headers ?? []).map((h) => ({ ...h })),
    });
    setIsEditing(true);
  };

  const handleApply = async (values: DraftServer) => {
    const trimmedName = values.name.trim();
    const trimmedUrl = values.url.trim();
    if (!trimmedName || !trimmedUrl) {
      toast.error(trimmedName ? t("serverUrlRequired") : t("serverNameRequired"));
      return;
    }

    setIsApplying(true);
    try {
      const existing = mcpServers.find(
        (s) => s.name === trimmedName || s.url === trimmedUrl
      );
      const server: MCPServer = {
        id: existing?.id ?? proposed.id,
        name: trimmedName,
        url: trimmedUrl,
        type: values.type,
        description: proposed.description,
        headers: values.headers.filter((h) => h.key.trim().length > 0),
        command: existing?.command ?? "",
        args: existing?.args ?? [],
        status: "connecting",
      };

      setMcpServers(
        existing
          ? mcpServers.map((s) => (s.id === existing.id ? server : s))
          : [...mcpServers, server]
      );
      setSelectedMcpServers(
        selectedMcpServers.includes(server.id)
          ? selectedMcpServers
          : [...selectedMcpServers, server.id]
      );

      const connected = await startServer(server.id, server);
      if (connected) {
        toast.success(t("aiConfigApplySuccess", { name: server.name }));
      } else {
        toast.error(t("aiConfigApplyConnectFailed", { name: server.name }));
      }
    } finally {
      setIsApplying(false);
      setIsEditing(false);
    }
  };

  if (isEditing && draft) {
    const updateDraft = (patch: Partial<DraftServer>) =>
      setDraft((d) => (d ? { ...d, ...patch } : d));
    const updateHeader = (index: number, patch: Partial<KeyValuePair>) =>
      setDraft((d) =>
        d
          ? {
              ...d,
              headers: d.headers.map((h, i) =>
                i === index ? { ...h, ...patch } : h
              ),
            }
          : d
      );
    const addHeader = () =>
      setDraft((d) =>
        d ? { ...d, headers: [...d.headers, { key: "", value: "" }] } : d
      );
    const removeHeader = (index: number) =>
      setDraft((d) =>
        d
          ? { ...d, headers: d.headers.filter((_, i) => i !== index) }
          : d
      );

    return (
      <div className="space-y-3">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("serverName")}
          </Label>
          <Input
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder={t("serverName")}
            className="h-8 text-xs"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("serverUrl")}
          </Label>
          <Input
            value={draft.url}
            onChange={(e) => updateDraft({ url: e.target.value })}
            placeholder="https://mcp.example.com/mcp"
            className="h-8 text-xs"
          />
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("transportType")}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["http", "sse"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateDraft({ type })}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-all ${
                  draft.type === type
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Globe className="h-3 w-3" />
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("httpHeaders")}
          </Label>
          <div className="space-y-1.5">
            {draft.headers.map((header, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  value={header.key}
                  onChange={(e) =>
                    updateHeader(index, { key: e.target.value })
                  }
                  placeholder={t("key")}
                  className="h-7 text-xs"
                />
                <Input
                  value={header.value}
                  onChange={(e) =>
                    updateHeader(index, { value: e.target.value })
                  }
                  placeholder={t("value")}
                  className="h-7 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={() => removeHeader(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={addHeader}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("aiConfigAddHeader")}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isApplying}
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => handleApply(draft)}
            disabled={isApplying || !draft.name.trim() || !draft.url.trim()}
          >
            {isApplying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ServerIcon className="h-3.5 w-3.5" />
            )}
            {isApplying ? t("aiConfigApplying") : t("aiConfigApply")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate text-xs font-semibold">
            {proposed.name}
          </span>
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-secondary-foreground">
            {proposed.type}
          </span>
        </div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {proposed.url}
        </div>
      </div>

      {proposed.headers && proposed.headers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {proposed.headers.map((h, i) => (
            <span
              key={i}
              className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {h.key}
            </span>
          ))}
        </div>
      )}

      {existing && !isExactMatch && (
        <p className="text-[11px] text-muted-foreground">
          {t("aiConfigUpdateHint")}
        </p>
      )}

      <div className="flex items-center gap-2">
        {isExactMatch ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("aiConfigApplied")}
          </div>
        ) : (
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            onClick={() => handleApply({
              name: proposed.name,
              url: proposed.url,
              type: proposed.type,
              headers: proposed.headers ?? [],
            })}
            disabled={isApplying}
          >
            {isApplying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ServerIcon className="h-3.5 w-3.5" />
            )}
            {isApplying
              ? t("aiConfigApplying")
              : existing
                ? t("aiConfigUpdate")
                : t("aiConfigApply")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={startEdit}
          disabled={isApplying}
        >
          <Pencil className="h-3 w-3" />
          {t("aiConfigEdit")}
        </Button>
      </div>
    </div>
  );
}

function headersEqual(
  a: { key: string; value: string }[],
  b: { key: string; value: string }[]
): boolean {
  const canonical = (headers: { key: string; value: string }[]) =>
    JSON.stringify(
      headers
        .map((h) => [h.key.trim().toLowerCase(), h.value.trim()])
        .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
    );
  return canonical(a) === canonical(b);
}

function extractProposedServer(result: unknown): ProposedMcpServer | null {
  if (!result) return null;
  let obj: unknown = result;
  if (typeof result === "string") {
    try {
      obj = JSON.parse(result);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  if (
    record.ok === true &&
    record.server &&
    typeof record.server === "object"
  ) {
    return record.server as ProposedMcpServer;
  }
  return null;
}
