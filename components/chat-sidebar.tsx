"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  PlusCircle,
  Trash2,
  ServerIcon,
  Settings,
  ChevronsUpDown,
  Copy,
  Pencil,
  GitBranchPlus,
  MoreHorizontal,
  Search,
  Pin,
  PinOff,
  Download,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { MCPServerManager } from "./mcp-server-manager";
import { AiProviderManager } from "./ai-provider-manager";
import { getUserId, updateUserId } from "@/lib/user-id";
import { useChats } from "@/lib/hooks/use-chats";
import { type Chat } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ExportChatDialog } from "./export-chat-dialog";
import { SettingsDialog } from "./settings-dialog";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMCP } from "@/lib/context/mcp-context";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "motion/react";
import { SystemPromptDialog } from "./system-prompt-dialog";

export function ChatSidebar() {
  const tChat = useTranslations("chat");
  const tUser = useTranslations("userMenu");
  const tUserId = useTranslations("userId");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string>("");
  const [mcpSettingsOpen, setMcpSettingsOpen] = useState(false);
  const [aiProviderOpen, setAiProviderOpen] = useState(false);
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [exportChatId, setExportChatId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [editUserIdOpen, setEditUserIdOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  // Get MCP server data from context
  const {
    mcpServers,
    setMcpServers,
    selectedMcpServers,
    setSelectedMcpServers,
  } = useMCP();

  // Initialize userId
  useEffect(() => {
    setUserId(getUserId());
  }, []);

  // Use TanStack Query to fetch chats
  const { chats, isLoading, deleteChat, renameChat, pinChat, refreshChats } = useChats(userId);

  // Start a new chat
  const handleNewChat = () => {
    router.push("/");
    router.refresh();
  };

  // Delete a chat
  const handleDeleteChat = async (chatId: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    deleteChat(chatId);

    // If we're currently on the deleted chat's page, navigate to home
    if (pathname === `/chat/${chatId}`) {
      router.push("/");
    }
  };

  // Start renaming a chat
  const handleStartRename = (chatId: string, currentTitle: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  // Toggle pin/unpin a chat
  const handleTogglePin = (chatId: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      pinChat({ chatId, pinned: !chat.pinnedAt });
    }
  };

  // Filter chats by search query (case-insensitive title match)
  const filteredChats = chatSearch.trim()
    ? chats.filter((chat) =>
        chat.title.toLowerCase().includes(chatSearch.trim().toLowerCase())
      )
    : chats;

  // Group chats by date sections (disabled while searching)
  const chatGroups = useMemo(() => {
    const isSearching = chatSearch.trim().length > 0;
    if (isSearching) {
      return [];
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfToday.getDate() - 1);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 7);

    const groups: { key: string; labelKey: string; chats: Chat[] }[] = [
      { key: "pinned", labelKey: "pinnedChats", chats: [] },
      { key: "today", labelKey: "today", chats: [] },
      { key: "yesterday", labelKey: "yesterday", chats: [] },
      { key: "last7", labelKey: "last7Days", chats: [] },
      { key: "older", labelKey: "older", chats: [] },
    ];

    for (const chat of chats) {
      const time = new Date(chat.updatedAt).getTime();
      if (chat.pinnedAt) {
        groups[0].chats.push(chat);
      } else if (time >= startOfToday.getTime()) {
        groups[1].chats.push(chat);
      } else if (time >= startOfYesterday.getTime()) {
        groups[2].chats.push(chat);
      } else if (time >= startOfWeek.getTime()) {
        groups[3].chats.push(chat);
      } else {
        groups[4].chats.push(chat);
      }
    }

    return groups.filter((g) => g.chats.length > 0);
  }, [chats, chatSearch]);

  // Save the renamed chat
  const handleSaveRename = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingChatId) return;

    const chatId = editingChatId;
    setEditingChatId(null);
    setEditingTitle("");

    const trimmed = editingTitle.trim();
    const currentChat = chats.find((c) => c.id === chatId);
    if (trimmed && currentChat && currentChat.title !== trimmed) {
      renameChat({ chatId, title: trimmed });
    }
  };

  // Get active MCP servers status
  const activeServersCount = selectedMcpServers.filter((id) =>
    mcpServers.some((s) => s.id === id)
  ).length;

  // Handle user ID update
  const handleUpdateUserId = () => {
    if (!newUserId.trim()) {
      toast.error(tUserId("cannotBeEmpty"));
      return;
    }

    updateUserId(newUserId.trim());
    setUserId(newUserId.trim());
    setEditUserIdOpen(false);
    toast.success(tUserId("updateSuccess"));

    window.location.reload();
  };

  // Show loading state if user ID is not yet initialized
  if (!userId) {
    return null; // Or a loading spinner
  }

  // Create chat loading skeletons
  const renderChatSkeletons = () => {
    return Array(3)
      .fill(0)
      .map((_, index) => (
        <SidebarMenuItem key={`skeleton-${index}`}>
          <div
            className={`flex items-center gap-2 px-3 py-2 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Skeleton className="h-4 w-4 rounded-full" />
            {!isCollapsed && (
              <>
                <Skeleton className="h-4 w-full max-w-[180px]" />
                <Skeleton className="h-5 w-5 ml-auto rounded-md flex-shrink-0" />
              </>
            )}
          </div>
        </SidebarMenuItem>
      ));
  };

  const renderChatItem = (chat: Chat) => (
    <AnimatePresence key={chat.id} initial={false}>
      <motion.div
        initial={{ opacity: 0, height: 0, y: -10 }}
        animate={{ opacity: 1, height: "auto", y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip={isCollapsed ? chat.title : undefined}
            data-active={pathname === `/chat/${chat.id}`}
            className={cn(
              "transition-all hover:bg-primary/10 active:bg-primary/15",
              pathname === `/chat/${chat.id}`
                ? "bg-secondary/60 hover:bg-secondary/60"
                : ""
            )}
          >
            {editingChatId === chat.id ? (
              <form
                onSubmit={handleSaveRename}
                className="flex items-center w-full gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveRename(e);
                    } else if (e.key === "Escape") {
                      e.stopPropagation();
                      setEditingChatId(null);
                      setEditingTitle("");
                    }
                  }}
                  placeholder={tChat("renamePlaceholder")}
                  className="min-w-0 flex-1 bg-background/60 border border-primary/40 rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </form>
            ) : (
              <Link
                href={`/chat/${chat.id}`}
                className="flex items-center justify-between w-full gap-1"
              >
                <div className="flex items-center min-w-0 overflow-hidden flex-1 pr-2">
                  <MessageSquare
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      pathname === `/chat/${chat.id}`
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                  {!isCollapsed && (
                    <span
                      className={cn(
                        "ml-2 truncate text-sm",
                        pathname === `/chat/${chat.id}`
                          ? "text-foreground font-medium"
                          : "text-foreground/80"
                      )}
                      title={chat.title}
                    >
                      {chat.pinnedAt && (
                        <Pin className="mr-1 inline h-3 w-3 text-amber-500" />
                      )}
                      {chat.title.length > 18
                        ? `${chat.title.slice(0, 18)}...`
                        : chat.title}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        title={tChat("chatActions")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      sideOffset={4}
                      className="w-44 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleTogglePin(chat.id);
                        }}
                      >
                        {chat.pinnedAt ? <PinOff /> : <Pin />}
                        {chat.pinnedAt ? tChat("unpinChat") : tChat("pinChat")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleStartRename(chat.id, chat.title);
                        }}
                      >
                        <Pencil />
                        {tChat("renameChat")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setExportChatId(chat.id);
                        }}
                      >
                        <Download />
                        {tChat("exportChat")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          handleDeleteChat(chat.id);
                        }}
                      >
                        <Trash2 />
                        {tChat("deleteChat")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <Sidebar
      className="shadow-sm bg-background/80 dark:bg-background/40 backdrop-blur-md"
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border/40">
        <div className="flex items-center justify-start">
          <div
            className={`flex items-center gap-2 ${
              isCollapsed ? "justify-center w-full" : ""
            }`}
          >
            <div
              className={`relative rounded-full bg-primary/70 flex items-center justify-center ${
                isCollapsed ? "size-5 p-3" : "size-6"
              }`}
            >
              <Image
                src="/scira.png"
                alt="MceChat AI Logo"
                width={24}
                height={24}
                className="absolute transform scale-75"
                unoptimized
                quality={100}
              />
            </div>
            {!isCollapsed && (
              <div className="font-semibold text-lg text-foreground/90">
                {tChat("title")}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-[calc(100vh-8rem)]">
        <SidebarGroup className="flex-1 min-h-0">
          <SidebarGroupLabel
            className={cn(
              "px-4 text-xs font-medium text-muted-foreground/80 uppercase tracking-wider",
              isCollapsed ? "sr-only" : ""
            )}
          >
            {tChat("chats")}
          </SidebarGroupLabel>
          {!isCollapsed && (
            <div className="px-3 pb-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder={tChat("searchChats")}
                  className="w-full rounded-md border border-border/60 bg-background/50 py-1.5 pl-8 pr-7 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                {chatSearch && (
                  <button
                    type="button"
                    onClick={() => setChatSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground"
                    title={tChat("clearSearch")}
                  >
                    <span className="text-xs">×</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <SidebarGroupContent
            className={cn(
              "overflow-y-auto pt-1",
              isCollapsed ? "overflow-x-hidden" : ""
            )}
          >
            <SidebarMenu>
              {isLoading ? (
                renderChatSkeletons()
              ) : filteredChats.length === 0 ? (
                <div
                  className={`flex items-center justify-center py-3 ${
                    isCollapsed ? "" : "px-4"
                  }`}
                >
                  {isCollapsed ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background/50">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md border border-dashed border-border/50 bg-background/50">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-normal">
                        {chatSearch.trim() ? tChat("noSearchResults") : tChat("noConversations")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                chatGroups.length > 0 ? (
                  chatGroups.map((group) => (
                    <div key={group.key}>
                      {!isCollapsed && (
                        <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                          {tChat(group.labelKey)}
                        </div>
                      )}
                      <div className={isCollapsed ? "flex flex-col items-center gap-0.5" : ""}>
                        {group.chats.map(renderChatItem)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={isCollapsed ? "flex flex-col items-center gap-0.5" : ""}>
                    {filteredChats.map(renderChatItem)}
                  </div>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="relative my-0">
          <div className="absolute inset-x-0">
            <Separator className="w-full h-px bg-border/40" />
          </div>
        </div>

        <SidebarGroup className="flex-shrink-0">
          <SidebarGroupLabel
            className={cn(
              "px-4 pt-0 text-xs font-medium text-muted-foreground/80 uppercase tracking-wider",
              isCollapsed ? "sr-only" : ""
            )}
          >
            {tUser("mcpServers")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setMcpSettingsOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-2 transition-all",
                    "hover:bg-secondary/50 active:bg-secondary/70"
                  )}
                  tooltip={isCollapsed ? tUser("mcpServers") : undefined}
                >
                  <ServerIcon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      activeServersCount > 0
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="flex-grow text-sm text-foreground/80">
                      {tUser("mcpServers")}
                    </span>
                  )}
                  {activeServersCount > 0 && !isCollapsed ? (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] px-1.5 py-0 h-5 bg-secondary/80"
                    >
                      {activeServersCount}
                    </Badge>
                  ) : activeServersCount > 0 && isCollapsed ? (
                    <SidebarMenuBadge className="bg-secondary/80 text-secondary-foreground">
                      {activeServersCount}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/40 mt-auto">
        <div
          className={`flex flex-col ${isCollapsed ? "items-center" : ""} gap-3`}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="default"
              className={cn(
                "w-full bg-primary text-primary-foreground hover:bg-primary/90",
                isCollapsed ? "w-8 h-8 p-0" : ""
              )}
              onClick={handleNewChat}
              title={isCollapsed ? tChat("newChat") : undefined}
            >
              <PlusCircle className={`${isCollapsed ? "" : "mr-2"} h-4 w-4`} />
              {!isCollapsed && <span>{tChat("newChat")}</span>}
            </Button>
          </motion.div>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Button
                  variant="ghost"
                  className="w-8 h-8 p-0 flex items-center justify-center"
                >
                  <Avatar className="h-6 w-6 rounded-lg bg-secondary/60">
                    <AvatarFallback className="rounded-lg text-xs font-medium text-secondary-foreground">
                      {userId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal bg-transparent border border-border/60 shadow-none px-2 h-10 hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 rounded-lg bg-secondary/60">
                      <AvatarFallback className="rounded-lg text-sm font-medium text-secondary-foreground">
                        {userId.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid text-left text-sm leading-tight">
                      <span className="truncate font-medium text-foreground/90">
                        {tUser("userId")}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userId.substring(0, 16)}...
                      </span>
                    </div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-lg"
              side={isCollapsed ? "top" : "top"}
              align={isCollapsed ? "start" : "end"}
              sideOffset={8}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg bg-secondary/60">
                    <AvatarFallback className="rounded-lg text-sm font-medium text-secondary-foreground">
                      {userId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-foreground/90">
                      {tUser("userId")}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userId}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(userId);
                    toast.success(tUserId("copySuccess"));
                  }}
                >
                  <Copy className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                  {tUser("copyUserId")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setEditUserIdOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                  {tUser("editUserId")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setSettingsOpen(true);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4 hover:text-sidebar-accent" />
                  {tUser("settings")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <MCPServerManager
          servers={mcpServers}
          onServersChange={setMcpServers}
          selectedServers={selectedMcpServers}
          onSelectedServersChange={setSelectedMcpServers}
          open={mcpSettingsOpen}
          onOpenChange={setMcpSettingsOpen}
        />

        <AiProviderManager
          open={aiProviderOpen}
          onOpenChange={setAiProviderOpen}
        />

        <SystemPromptDialog
          open={systemPromptOpen}
          onOpenChange={setSystemPromptOpen}
        />

        <ExportChatDialog
          chatId={exportChatId ?? ""}
          userId={userId}
          open={exportChatId !== null}
          onOpenChange={(open) => {
            if (!open) setExportChatId(null);
          }}
        />

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onOpenMCP={() => setMcpSettingsOpen(true)}
          onOpenAIProvider={() => setAiProviderOpen(true)}
          onOpenSystemPrompt={() => setSystemPromptOpen(true)}
        />
      </SidebarFooter>

      <Dialog
        open={editUserIdOpen}
        onOpenChange={(open) => {
          setEditUserIdOpen(open);
          if (open) {
            setNewUserId(userId);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{tUserId("editTitle")}</DialogTitle>
            <DialogDescription>
              {tUserId("editDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="userId">{tUserId("label")}</Label>
              <Input
                id="userId"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder={tUserId("placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserIdOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleUpdateUserId}>{tCommon("saveChanges")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
