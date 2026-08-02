"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileJson, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadConversation } from "@/lib/export-chat";
import { convertToUIMessages } from "@/lib/chat-store";
import type { Message as DBMessage } from "@/lib/db/schema";
import type { UIMessage } from "ai";
import { toast } from "sonner";

export function ExportChatDialog({
  chatId,
  userId,
  open,
  onOpenChange,
}: {
  chatId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("chat");
  const [exporting, setExporting] = useState<"markdown" | "json" | null>(null);

  const handleExport = async (format: "markdown" | "json") => {
    if (exporting) return;
    setExporting(format);
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: { "x-user-id": userId },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch chat");
      }
      const chatData = (await response.json()) as { messages: DBMessage[] };
      const uiMessages = convertToUIMessages(chatData.messages ?? []);
      downloadConversation(uiMessages as unknown as UIMessage[], format);
      onOpenChange(false);
      toast.success(t("exportSuccess"));
    } catch (err) {
      console.error("Error exporting chat:", err);
      toast.error(t("exportError"));
    } finally {
      setExporting(null);
    }
  };

  const options = [
    {
      format: "markdown" as const,
      icon: FileText,
      label: t("exportMarkdown"),
      description: t("exportMarkdownDesc"),
    },
    {
      format: "json" as const,
      icon: FileJson,
      label: t("exportJson"),
      description: t("exportJsonDesc"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("exportChat")}</DialogTitle>
          <DialogDescription>{t("exportDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {options.map((option) => {
            const Icon = option.icon;
            const isLoading = exporting === option.format;
            return (
              <Button
                key={option.format}
                variant="outline"
                disabled={exporting !== null}
                onClick={() => handleExport(option.format)}
                className="justify-start h-auto py-3 px-4 gap-3"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground",
                    isLoading && "animate-pulse"
                  )}
                />
                <span className="flex flex-col items-start gap-0.5 min-w-0">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground text-left">
                    {option.description}
                  </span>
                </span>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
