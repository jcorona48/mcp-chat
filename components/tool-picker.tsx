"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Shield, ShieldAlert, Wrench } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useMCP } from "@/lib/context/mcp-context";
import { cn } from "@/lib/utils";

export function ToolPicker() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolPickerButton />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <ToolPickerContent />
      </PopoverContent>
    </Popover>
  );
}

export function ToolPickerButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const t = useTranslations("toolPicker");
  const { activeTools, disabledTools } = useMCP();
  const { className, title, ...rest } = props;

  const totalTools = useMemo(
    () => activeTools.reduce((acc, group) => acc + group.tools.length, 0),
    [activeTools],
  );
  const hasDisabled = totalTools - disabledTools.length < totalTools;

  return (
    <button
      type="button"
      {...rest}
      title={title ?? t("tooltip")}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors",
        hasDisabled && "text-primary",
        className,
      )}
      aria-label={t("tooltip")}
    >
      <Wrench className="h-4 w-4" />
      {hasDisabled && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

export function ToolPickerContent() {
  const t = useTranslations("toolPicker");
  const {
    activeTools,
    disabledTools,
    setDisabledTools,
    approvalTools,
    setApprovalTools,
  } = useMCP();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [approvalFilter, setApprovalFilter] = useState(false);
  const serverCheckboxRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const totalTools = useMemo(
    () => activeTools.reduce((acc, group) => acc + group.tools.length, 0),
    [activeTools],
  );
  const activeCount = totalTools - disabledTools.length;
  const hasDisabled = activeCount < totalTools;
  const hasManyServers = activeTools.length > 3;
  const isSearching = search.trim().length > 0;
  const approvalCount = useMemo(
    () =>
      activeTools.reduce(
        (acc, group) =>
          acc + group.tools.filter((t) => approvalTools.includes(t.name)).length,
        0,
      ),
    [activeTools, approvalTools],
  );

  const isToolDisabled = (name: string) => disabledTools.includes(name);

  const isToolApproval = (name: string) => approvalTools.includes(name);

  const toggleApproval = (name: string) => {
    setApprovalTools(
      isToolApproval(name)
        ? approvalTools.filter((n) => n !== name)
        : [...approvalTools, name],
    );
  };

  const isCollapsed = (serverId: string) =>
    isSearching ? false : collapsed[serverId] ?? hasManyServers;

  const toggleGroup = (serverId: string) =>
    setCollapsed((prev) => ({ ...prev, [serverId]: !isCollapsed(serverId) }));

  const setAllGroups = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const group of activeTools) next[group.serverId] = value;
    setCollapsed(next);
  };

  const toggleTool = (name: string) => {
    setDisabledTools(
      isToolDisabled(name)
        ? disabledTools.filter((n) => n !== name)
        : [...disabledTools, name],
    );
  };

  const setGroupApproval = (names: string[]) => {
    const allApproved = names.every((n) => approvalTools.includes(n));
    const next = new Set(approvalTools);
    for (const name of names) {
      if (allApproved) {
        next.delete(name);
      } else {
        next.add(name);
      }
    }
    setApprovalTools([...next]);
  };

  const setServerTools = (
    toolNames: string[],
    enabled: boolean,
  ) => {
    const next = new Set(disabledTools);
    for (const name of toolNames) {
      if (enabled) {
        next.delete(name);
      } else {
        next.add(name);
      }
    }
    setDisabledTools([...next]);
  };

  const activateAll = () => setDisabledTools([]);

  useEffect(() => {
    for (const group of activeTools) {
      const el = serverCheckboxRefs.current.get(group.serverId);
      if (!el) continue;
      const names = group.tools.map((tool) => tool.name);
      const anyEnabled = names.some((name) => !disabledTools.includes(name));
      const allEnabled = names.every((name) => !disabledTools.includes(name));
      el.indeterminate = anyEnabled && !allEnabled;
    }
  }, [activeTools, disabledTools]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeTools
      .map((group) => {
        let tools = group.tools;
        if (approvalFilter) {
          tools = tools.filter((tool) =>
            approvalTools.includes(tool.name),
          );
        }
        if (query) {
          tools = tools.filter(
            (tool) =>
              tool.name.toLowerCase().includes(query) ||
              (tool.description ?? "").toLowerCase().includes(query),
          );
        }
        return { ...group, tools };
      })
      .filter((group) => group.tools.length > 0);
  }, [activeTools, search, approvalFilter, approvalTools]);

  const showSearch = totalTools > 12;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2">
          <span className="text-sm font-medium">{t("title")}</span>
          <div className="flex items-center gap-2">
            {hasManyServers && !isSearching && (
              <>
                <button
                  type="button"
                  onClick={() => setAllGroups(false)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {t("expandAll")}
                </button>
                <button
                  type="button"
                  onClick={() => setAllGroups(true)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {t("collapseAll")}
                </button>
              </>
            )}
            <span className="text-xs text-muted-foreground">
              {t("activeCount", { active: activeCount, total: totalTools })}
            </span>
            {hasDisabled && (
              <button
                type="button"
                onClick={activateAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("activateAll")}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setApprovalFilter((v) => !v)}
            aria-pressed={approvalFilter}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              approvalFilter
                ? "bg-amber-500/15 text-amber-500"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
            )}
          >
            <ShieldAlert className="h-3 w-3" />
            {t("approvalOnly")}
            {approvalCount > 0 && (
              <span className="tabular-nums opacity-80">{approvalCount}</span>
            )}
          </button>
          {approvalFilter && approvalCount === 0 && (
            <span className="text-[10px] text-muted-foreground">
              {t("noApprovalTools")}
            </span>
          )}
        </div>
        {showSearch && (
          <div className="px-3 py-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-8 text-xs"
            />
          </div>
        )}
        <div className="max-h-72 overflow-y-auto p-2 no-scrollbar">
          {activeTools.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {t("noTools")}
            </p>
          ) : filteredGroups.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {approvalFilter ? t("noApprovalTools") : t("noTools")}
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredGroups.map((group) => {
                const groupToolNames = group.tools.map((tool) => tool.name);
                const allEnabled = groupToolNames.every(
                  (name) => !isToolDisabled(name),
                );
                const enabledCount = groupToolNames.filter(
                  (name) => !isToolDisabled(name),
                ).length;
                const groupCollapsed = isCollapsed(group.serverId);
                return (
                  <div key={group.serverId} className="grid gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.serverId)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left hover:bg-muted/60"
                        aria-expanded={!groupCollapsed}
                      >
                        {groupCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-xs font-semibold">
                          {group.serverName}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px]",
                            enabledCount < group.tools.length
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {enabledCount}/{group.tools.length}
                        </span>
                      </button>
                      <input
                        ref={(el) => {
                          if (el) {
                            serverCheckboxRefs.current.set(
                              group.serverId,
                              el,
                            );
                          } else {
                            serverCheckboxRefs.current.delete(group.serverId);
                          }
                        }}
                        type="checkbox"
                        checked={allEnabled}
                        onChange={(e) =>
                          setServerTools(groupToolNames, e.target.checked)
                        }
                        className="accent-primary h-3.5 w-3.5"
                        aria-label={group.serverName}
                      />
                      <button
                        type="button"
                        onClick={() => setGroupApproval(groupToolNames)}
                        aria-pressed={groupToolNames.every((name) =>
                          isToolApproval(name),
                        )}
                        aria-label={
                          groupToolNames.some((name) => isToolApproval(name))
                            ? t("autoExecute")
                            : t("requireApproval")
                        }
                        title={
                          groupToolNames.some((name) => isToolApproval(name))
                            ? t("autoExecute")
                            : t("requireApproval")
                        }
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                          groupToolNames.some((name) => isToolApproval(name))
                            ? "bg-amber-500/15 text-amber-500"
                            : "text-muted-foreground/40 hover:text-muted-foreground",
                        )}
                      >
                        {groupToolNames.some((name) => isToolApproval(name)) ? (
                          <ShieldAlert className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {!groupCollapsed && (
                      <div className="grid gap-0.5">
                        {group.tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex min-w-0 items-center gap-1 rounded-md px-1 py-1.5 text-xs hover:bg-muted/60"
                          >
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!isToolDisabled(tool.name)}
                                onChange={() => toggleTool(tool.name)}
                                className="accent-primary h-3.5 w-3.5"
                              />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {tool.name}
                              </span>
                            </label>
                            {tool.description && (
                              <span className="max-w-24 truncate text-[10px] text-muted-foreground">
                                {tool.description}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleApproval(tool.name)}
                              aria-pressed={isToolApproval(tool.name)}
                              aria-label={
                                isToolApproval(tool.name)
                                  ? t("autoExecute")
                                  : t("requireApproval")
                              }
                              title={
                                isToolApproval(tool.name)
                                  ? t("autoExecute")
                                  : t("requireApproval")
                              }
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                                isToolApproval(tool.name)
                                  ? "bg-amber-500/15 text-amber-500"
                                  : "text-muted-foreground/40 hover:text-muted-foreground",
                              )}
                            >
                              {isToolApproval(tool.name) ? (
                                <ShieldAlert className="h-3.5 w-3.5" />
                              ) : (
                                <Shield className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border/40 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          {t("approvalHint")}
        </div>
    </div>
  );
}
