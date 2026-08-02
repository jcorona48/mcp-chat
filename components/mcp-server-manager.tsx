"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  PlusCircle,
  ServerIcon,
  X,
  Globe,
  ExternalLink,
  Trash2,
  CheckCircle,
  Plus,
  Cog,
  Edit2,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  KeyValuePair,
  MCPServer,
  ServerStatus,
  useMCP,
  MCPTool,
} from "@/lib/context/mcp-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Default template for a new MCP server
const INITIAL_NEW_SERVER: Omit<MCPServer, "id"> = {
  name: "",
  url: "",
  type: "http",
  command: "",
  args: [],
  headers: [],
};

interface MCPServerManagerProps {
  servers: MCPServer[];
  onServersChange: (servers: MCPServer[]) => void;
  selectedServers: string[];
  onSelectedServersChange: (serverIds: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Check if a key name might contain sensitive information
const isSensitiveKey = (key: string): boolean => {
  const sensitivePatterns = [
    /key/i,
    /token/i,
    /secret/i,
    /password/i,
    /pass/i,
    /auth/i,
    /credential/i,
  ];
  return sensitivePatterns.some((pattern) => pattern.test(key));
};

// Mask a sensitive value
const maskValue = (value: string): string => {
  if (!value) return "";
  if (value.length < 8) return "••••••";
  return (
    value.substring(0, 3) +
    "•".repeat(Math.min(10, value.length - 4)) +
    value.substring(value.length - 1)
  );
};

// Update the StatusIndicator to use Tooltip component
const StatusIndicator = ({
  status,
  onClick,
  hoverInfo,
  latencyMs,
}: {
  status?: ServerStatus;
  onClick?: () => void;
  hoverInfo?: string;
  latencyMs?: number;
}) => {
  const t = useTranslations("mcp");
  const isClickable = !!onClick;
  const hasHoverInfo = !!hoverInfo;

  const className = `hrink-0 flex items-center gap-1 ${
    isClickable ? "cursor-pointer" : ""
  }`;

  const statusIndicator = (status: ServerStatus | undefined) => {
    switch (status) {
      case "connected":
        return (
          <div className={className} onClick={onClick}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500 hover:underline">
              {t("connected")}
              {latencyMs !== undefined && (
                <span className="ml-1 text-green-600/80 font-mono">
                  {latencyMs}ms
                </span>
              )}
            </span>
          </div>
        );
      case "connecting":
        return (
          <div className={className} onClick={onClick}>
            <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
            <span className="text-xs text-amber-500">{t("connecting")}</span>
          </div>
        );
      case "error":
        return (
          <div className={className} onClick={onClick}>
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-500 hover:underline">{t("error")}</span>
          </div>
        );
      case "disconnected":
      default:
        return (
          <div className={className} onClick={onClick}>
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-xs text-muted-foreground">{t("disconnected")}</span>
          </div>
        );
    }
  };

  // Use Tooltip if we have hover info
  if (hasHoverInfo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{statusIndicator(status)}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-[300px] break-all text-wrap"
        >
          {hoverInfo}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Otherwise just return the status indicator
  return statusIndicator(status);
};

// Add a component to display tools
const ToolsList = ({ tools }: { tools?: MCPTool[] }) => {
  const t = useTranslations("mcp");
  const [showAllTools, setShowAllTools] = useState(false);

  if (!tools || tools.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {t("noToolsAvailable")}
      </div>
    );
  }

  const hasMore = tools.length > 3;
  const visibleTools = showAllTools ? tools : tools.slice(0, 3);

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {t("toolsCount")} ({tools.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {visibleTools.map((tool, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground cursor-help">
                  {tool.name}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-62.5 bg-primary/90 backdrop-blur"
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <div className="font-bold wrap-break-word text-secondary-foreground">{tool.name}</div>
                  {tool.description && (
                    <div className="text-xs text-secondary-foreground max-h-32 overflow-y-auto pr-1 wrap-break-word">
                      {tool.description}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {hasMore &&
          (showAllTools ? (
            <button
              type="button"
              onClick={() => setShowAllTools(false)}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground hover:bg-muted cursor-pointer"
            >
              {t("showLess")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAllTools(true)}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground hover:bg-secondary cursor-pointer"
            >
              +{tools.length - 3} {t("more")}
            </button>
          ))}
      </div>
    </div>
  );
};

export const MCPServerManager = ({
  servers,
  onServersChange,
  selectedServers,
  onSelectedServersChange,
  open,
  onOpenChange,
}: MCPServerManagerProps) => {
  const t = useTranslations("mcp");
  const [newServer, setNewServer] =
    useState<Omit<MCPServer, "id">>(INITIAL_NEW_SERVER);
  const [view, setView] = useState<"list" | "add">("list");
  const [newHeader, setNewHeader] = useState<KeyValuePair>({
    key: "",
    value: "",
  });
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [showSensitiveHeaderValues, setShowSensitiveHeaderValues] = useState<
    Record<number, boolean>
  >({});
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(
    null
  );
  const [editedHeaderValue, setEditedHeaderValue] = useState<string>("");

  // Add access to the MCP context for server control
  const { startServer, stopServer, updateServerStatus } = useMCP();

  // Only count selections that still reference an existing server
  const activeServersCount = selectedServers.filter((id) =>
    servers.some((s) => s.id === id)
  ).length;

  const resetAndClose = () => {
    setView("list");
    setNewServer(INITIAL_NEW_SERVER);
    setNewHeader({ key: "", value: "" });
    setShowSensitiveHeaderValues({});
    setEditingHeaderIndex(null);
    onOpenChange(false);
  };

  const addServer = () => {
    if (!newServer.name) {
      toast.error(t("serverNameRequired"));
      return;
    }

    if (!newServer.url) {
      toast.error(t("serverUrlRequired"));
      return;
    }

    const id = crypto.randomUUID();
    const updatedServers = [...servers, { ...newServer, id }];
    onServersChange(updatedServers);

    toast.success(t("addedServer", { name: newServer.name }));
    setView("list");
    setNewServer(INITIAL_NEW_SERVER);
    setNewHeader({ key: "", value: "" });
    setShowSensitiveHeaderValues({});
  };

  const removeServer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedServers = servers.filter((server) => server.id !== id);
    onServersChange(updatedServers);

    if (selectedServers.includes(id)) {
      onSelectedServersChange(
        selectedServers.filter((serverId) => serverId !== id)
      );
    }

    toast.success(t("serverRemoved"));
  };

  const toggleServer = (id: string) => {
    if (selectedServers.includes(id)) {
      onSelectedServersChange(
        selectedServers.filter((serverId) => serverId !== id)
      );
      const server = servers.find((s) => s.id === id);

      if (server) {
        toast.success(t("disabledServer", { name: server.name }));
      }
    } else {
      onSelectedServersChange([...selectedServers, id]);
      const server = servers.find((s) => s.id === id);

      if (server) {
        if (
          !server.status ||
          server.status === "disconnected" ||
          server.status === "error"
        ) {
          updateServerStatus(server.id, "connecting");
          startServer(id)
            .then((success) => {
              if (success) {
                console.log(t("serverConnected", { name: server.name }));
              } else {
                console.error(t("failedToConnect", { name: server.name }));
              }
            })
            .catch((error) => {
              console.error(`${t("failedToConnect", { name: server.name })}:`, error);
              updateServerStatus(
                server.id,
                "error",
                `${t("failedToConnect")}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            });
        }

        toast.success(t("enabledServer", { name: server.name }));
      }
    }
  };

  const clearAllServers = () => {
    if (selectedServers.length > 0) {
      onSelectedServersChange([]);
      toast.success(t("allServersDisabled"));
      resetAndClose();
    }
  };

  const addHeader = () => {
    if (!newHeader.key) return;

    setNewServer({
      ...newServer,
      headers: [...(newServer.headers || []), { ...newHeader }],
    });

    setNewHeader({ key: "", value: "" });
  };

  const removeHeader = (index: number) => {
    const updatedHeaders = [...(newServer.headers || [])];
    updatedHeaders.splice(index, 1);
    setNewServer({ ...newServer, headers: updatedHeaders });

    // Clean up visibility state for this index
    const updatedVisibility = { ...showSensitiveHeaderValues };
    delete updatedVisibility[index];
    setShowSensitiveHeaderValues(updatedVisibility);

    // If currently editing this value, cancel editing
    if (editingHeaderIndex === index) {
      setEditingHeaderIndex(null);
    }
  };

  const startEditHeaderValue = (index: number, value: string) => {
    setEditingHeaderIndex(index);
    setEditedHeaderValue(value);
  };

  const saveEditedHeaderValue = () => {
    if (editingHeaderIndex !== null) {
      const updatedHeaders = [...(newServer.headers || [])];
      updatedHeaders[editingHeaderIndex] = {
        ...updatedHeaders[editingHeaderIndex],
        value: editedHeaderValue,
      };
      setNewServer({ ...newServer, headers: updatedHeaders });
      setEditingHeaderIndex(null);
    }
  };

  const toggleSensitiveHeaderValue = (index: number) => {
    setShowSensitiveHeaderValues((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const hasAdvancedConfig = (server: MCPServer) => {
    return server.headers && server.headers.length > 0;
  };

  // Editing support
  const startEditing = (server: MCPServer) => {
    setEditingServerId(server.id);
    setNewServer({
      name: server.name,
      url: server.url,
      type: server.type,
      command: server.command,
      args: server.args,
      headers: server.headers,
    });
    setView("add");
    // Reset sensitive value visibility states
    setShowSensitiveHeaderValues({});
    setEditingHeaderIndex(null);
  };

  const handleFormCancel = () => {
    if (view === "add") {
      setView("list");
      setEditingServerId(null);
      setNewServer(INITIAL_NEW_SERVER);
      setShowSensitiveHeaderValues({});
      setEditingHeaderIndex(null);
    } else {
      resetAndClose();
    }
  };

  const updateServer = () => {
    if (!newServer.name) {
      toast.error(t("serverNameRequired"));
      return;
    }
    if (!newServer.url) {
      toast.error(t("serverUrlRequired"));
      return;
    }
    const updated = servers.map((s) =>
      s.id === editingServerId ? { ...newServer, id: editingServerId! } : s
    );
    onServersChange(updated);
    toast.success(t("updatedServer", { name: newServer.name }));
    setView("list");
    setEditingServerId(null);
    setNewServer(INITIAL_NEW_SERVER);
    setShowSensitiveHeaderValues({});
  };

  // Update functions to control servers
  const toggleServerStatus = async (server: MCPServer, e: React.MouseEvent) => {
    e.stopPropagation();

    if (
      !server.status ||
      server.status === "disconnected" ||
      server.status === "error"
    ) {
      try {
        updateServerStatus(server.id, "connecting");
        const success = await startServer(server.id);

        if (success) {
          toast.success(t("startedServer", { name: server.name }));
        } else {
          toast.error(t("failedToStartServer", { name: server.name }));
        }
      } catch (error) {
        updateServerStatus(
          server.id,
          "error",
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        toast.error(
          `${t("errorStartingServer")}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      try {
        const success = await stopServer(server.id);
        if (success) {
          toast.success(t("stoppedServer", { name: server.name }));
        } else {
          toast.error(t("failedToStopServer", { name: server.name }));
        }
      } catch (error) {
        toast.error(
          `${t("errorStoppingServer")}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  };

  // Update function to restart a server
  const restartServer = async (server: MCPServer, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (server.status === "connected" || server.status === "connecting") {
        await stopServer(server.id);
      }

      setTimeout(async () => {
        updateServerStatus(server.id, "connecting");
        const success = await startServer(server.id);

        if (success) {
          toast.success(t("restartedServer", { name: server.name }));
        } else {
          toast.error(t("failedToRestartServer", { name: server.name }));
        }
      }, 500);
    } catch (error) {
      updateServerStatus(
        server.id,
        "error",
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      toast.error(
        `${t("errorRestartingServer")}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // UI element to display the correct server URL
  const getServerDisplayUrl = (server: MCPServer): string => {
    return server.url;
  };

  // Update the hover info function to return richer content
  const getServerStatusHoverInfo = (server: MCPServer): string | undefined => {
    // For error status, show the error message
    if (server.status === "error" && server.errorMessage) {
      return `Error: ${server.errorMessage}`;
    }

    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
            {activeServersCount > 0 && (
              <span className="block mt-1 text-xs font-medium text-primary">
                {t("activeServers", {
                  count: activeServersCount,
                  plural: activeServersCount === 1 ? "one" : "other",
                })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {view === "list" ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {servers.length > 0 ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">{t("availableServers")}</h3>
                    <span className="text-xs text-muted-foreground">
                      {t("selectMultipleServers")}
                    </span>
                  </div>
                  <div className="overflow-y-auto pr-1 flex-1 gap-2.5 flex flex-col pb-16">
                    {servers
                      .sort((a, b) => {
                        const aActive = selectedServers.includes(a.id);
                        const bActive = selectedServers.includes(b.id);
                        if (aActive && !bActive) return -1;
                        if (!aActive && bActive) return 1;
                        return 0;
                      })
                      .map((server) => {
                        const isActive = selectedServers.includes(server.id);
                        const isRunning =
                          server.status === "connected" ||
                          server.status === "connecting";

                        return (
                          <div
                            key={server.id}
                            className={`
                            relative flex flex-col p-3.5 rounded-xl transition-colors
                            border ${
                              isActive
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/30 hover:bg-primary/5"
                            }
                          `}
                          >
                            {/* Server Header with Type Badge and Actions */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Globe
                                  className={`h-4 w-4 ${
                                    isActive
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  } flex-shrink-0`}
                                />
                                <h4 className="text-sm font-medium truncate max-w-[160px]">
                                  {server.name}
                                </h4>
                                {hasAdvancedConfig(server) && (
                                  <span className="flex-shrink-0">
                                    <Cog className="h-3 w-3 text-muted-foreground" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                  {server.url?.endsWith("/sse")
                                    ? "SSE"
                                    : "HTTP"}
                                </span>

                                {/* Status indicator */}
                                <StatusIndicator
                                  status={server.status}
                                  onClick={() =>
                                    server.errorMessage &&
                                    toast.error(server.errorMessage)
                                  }
                                  hoverInfo={getServerStatusHoverInfo(server)}
                                  latencyMs={server.latencyMs}
                                />

                                {/* Server actions */}
                                <div className="flex items-center">
                                  <button
                                    onClick={(e) =>
                                      toggleServerStatus(server, e)
                                    }
                                    className="p-1 rounded-full hover:bg-muted/70"
                                    aria-label={
                                      isRunning ? t("stopServer") : t("startServer")
                                    }
                                    title={
                                      isRunning ? t("stopServer") : t("startServer")
                                    }
                                  >
                                    <Power
                                      className={`h-3.5 w-3.5 ${
                                        isRunning
                                          ? "text-red-500"
                                          : "text-green-500"
                                      }`}
                                    />
                                  </button>

                                  <button
                                    onClick={(e) => restartServer(server, e)}
                                    className="p-1 rounded-full hover:bg-muted/70"
                                    aria-label={t("restartServer")}
                                    title={t("restartServer")}
                                    disabled={server.status === "connecting"}
                                  >
                                    <RefreshCw
                                      className={`h-3.5 w-3.5 text-muted-foreground ${
                                        server.status === "connecting"
                                          ? "opacity-50"
                                          : ""
                                      }`}
                                    />
                                  </button>

                                  <button
                                    onClick={(e) => removeServer(server.id, e)}
                                    className="p-1 rounded-full hover:bg-muted/70"
                                    aria-label={t("removeServer")}
                                    title={t("removeServer")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>

                                  <button
                                    onClick={() => startEditing(server)}
                                    className="p-1 rounded-full hover:bg-muted/50"
                                    aria-label={t("editServerAction")}
                                    title={t("editServerAction")}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Server Details */}
                            <p className="text-xs text-muted-foreground mb-2.5 truncate">
                              {getServerDisplayUrl(server)}
                            </p>

                            {/* Tools List */}
                            {server.status === "connected" && (
                              <div className="mb-2.5">
                                <ToolsList tools={server.tools} />
                              </div>
                            )}

                            {/* Action Button */}
                              <Button
                                size="sm"
                                className="w-full gap-1.5 hover:text-black hover:dark:text-white rounded-lg"
                                variant={isActive ? "default" : "outline"}
                                onClick={() => toggleServer(server.id)}
                              >
                                {isActive && (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                {isActive ? t("active") : t("enableServer")}
                              </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 py-8 pb-16 flex flex-col items-center justify-center space-y-4">
                <div className="rounded-full p-3 bg-primary/10">
                  <ServerIcon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-medium">
                    {t("noServersAdded")}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[300px]">
                    {t("noServersDescription")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
                  <a
                    href="https://modelcontextprotocol.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {t("learnAboutMCP")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto px-1 py-0.5 mb-14 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <h3 className="text-sm font-medium">
              {editingServerId ? t("editServer") : t("addNewServer")}
            </h3>
            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">{t("serverName")}</Label>
                <Input
                  id="name"
                  value={newServer.name}
                  onChange={(e) =>
                    setNewServer({ ...newServer, name: e.target.value })
                  }
                  placeholder={t("serverName")}
                  className="relative z-0"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="transport-type">{t("transportType")}</Label>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("chooseTransport")}
                  </p>
                  <div className="grid gap-2 grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewServer({ ...newServer, type: "sse" })
                      }
                      className={`flex items-center gap-2 p-3 rounded-md text-left border transition-all ${
                        newServer.type === "sse"
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:border-border/80 hover:bg-muted/50"
                      }`}
                    >
                      <Globe
                        className={`h-5 w-5 shrink-0 ${
                          newServer.type === "sse" ? "text-primary" : ""
                        }`}
                      />
                      <div>
                        <p className="font-medium">SSE</p>
                        <p className="text-xs text-muted-foreground">
                          {t("sseDescription")}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNewServer({ ...newServer, type: "http" })
                      }
                      className={`flex items-center gap-2 p-3 rounded-md text-left border transition-all ${
                        newServer.type === "http"
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:border-border/80 hover:bg-muted/50"
                      }`}
                    >
                      <Globe
                        className={`h-5 w-5 shrink-0 ${
                          newServer.type === "http" ? "text-primary" : ""
                        }`}
                      />
                      <div>
                        <p className="font-medium">HTTP</p>
                        <p className="text-xs text-muted-foreground">
                          {t("httpDescription")}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="url">{t("serverUrl")}</Label>
                <Input
                  id="url"
                  value={newServer.url}
                  onChange={(e) =>
                    setNewServer({ ...newServer, url: e.target.value })
                  }
                  placeholder="https://mcp.example.com/token/mcp"
                  className="relative z-0"
                />
                <p className="text-xs text-muted-foreground">
                  {t("urlHint", {
                    transport: newServer.type === "sse" ? "SSE" : "HTTP",
                  })}
                </p>
              </div>

              {/* Advanced Configuration */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="headers">
                  <AccordionTrigger className="text-sm py-2">
                    {t("httpHeaders")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label
                            htmlFor="header-key"
                            className="text-xs mb-1 block"
                          >
                            {t("key")}
                          </Label>
                          <Input
                            id="header-key"
                            value={newHeader.key}
                            onChange={(e) =>
                              setNewHeader({
                                ...newHeader,
                                key: e.target.value,
                              })
                            }
                            placeholder="Authorization"
                            className="h-8 relative z-0"
                          />
                        </div>
                        <div className="flex-1">
                          <Label
                            htmlFor="header-value"
                            className="text-xs mb-1 block"
                          >
                            {t("value")}
                          </Label>
                          <Input
                            id="header-value"
                            value={newHeader.value}
                            onChange={(e) =>
                              setNewHeader({
                                ...newHeader,
                                value: e.target.value,
                              })
                            }
                            placeholder="Bearer token123"
                            className="h-8 relative z-0"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addHeader}
                          disabled={!newHeader.key}
                          className="h-8 mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {newServer.headers && newServer.headers.length > 0 ? (
                        <div className="border rounded-md divide-y">
                          {newServer.headers.map((header, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 text-sm"
                            >
                              <div className="flex-1 flex items-center gap-1 truncate">
                                <span className="font-mono text-xs">
                                  {header.key}
                                </span>
                                <span className="mx-2 text-muted-foreground">
                                  :
                                </span>

                                {editingHeaderIndex === index ? (
                                  <div className="flex gap-1 flex-1">
                                    <Input
                                      className="h-6 text-xs py-1 px-2"
                                      value={editedHeaderValue}
                                      onChange={(e) =>
                                        setEditedHeaderValue(e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        saveEditedHeaderValue()
                                      }
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={saveEditedHeaderValue}
                                    >
                                      {t("save")}
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {isSensitiveKey(header.key) &&
                                      !showSensitiveHeaderValues[index]
                                        ? maskValue(header.value)
                                        : header.value}
                                    </span>
                                    <span className="flex ml-1 gap-1">
                                      {isSensitiveKey(header.key) && (
                                        <button
                                          onClick={() =>
                                            toggleSensitiveHeaderValue(index)
                                          }
                                          className="p-1 hover:bg-muted/50 rounded-full"
                                        >
                                          {showSensitiveHeaderValues[index] ? (
                                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                                          ) : (
                                            <Eye className="h-3 w-3 text-muted-foreground" />
                                          )}
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          startEditHeaderValue(
                                            index,
                                            header.value
                                          )
                                        }
                                        className="p-1 hover:bg-muted/50 rounded-full"
                                      >
                                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                                      </button>
                                    </span>
                                  </>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeHeader(index)}
                                className="h-6 w-6 p-0 ml-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          {t("noHeadersAdded")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t("httpHeadersHint", {
                          transport: newServer.type === "sse" ? "SSE" : "HTTP",
                        })}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}

        {/* Persistent fixed footer with buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex justify-between z-10">
          {view === "list" ? (
            <>
              <Button
                variant="outline"
                onClick={clearAllServers}
                size="sm"
                className="gap-1.5 hover:text-black hover:dark:text-white"
                disabled={selectedServers.length === 0}
              >
                <X className="h-3.5 w-3.5" />
                {t("disableAll")}
              </Button>
              <Button
                onClick={() => setView("add")}
                size="sm"
                className="gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {t("addServer")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleFormCancel}>
                {t("cancel")}
              </Button>
              <Button
                onClick={editingServerId ? updateServer : addServer}
                disabled={!newServer.name || !newServer.url}
              >
                {editingServerId ? t("saveChanges") : t("addServer")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
