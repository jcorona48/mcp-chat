"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImportChatDialog({
  userId,
  open,
  onOpenChange,
  onImported,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (chatId: string) => void;
}) {
  const t = useTranslations("chat");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    if (!file || importing) return;
    setImporting(true);
    try {
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        toast.error(t("importInvalidFile"));
        return;
      }

      let messages = Array.isArray(data) ? data : null;
      if (!messages && data && typeof data === "object") {
        const wrapped = (data as { messages?: unknown }).messages;
        if (Array.isArray(wrapped)) messages = wrapped;
      }

      if (!messages || messages.length === 0) {
        toast.error(t("importInvalidFile"));
        return;
      }

      const response = await fetch("/api/chats/import", {
        method: "POST",
        headers: {
          "x-user-id": userId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error("Failed to import chat");
      }

      const { id } = (await response.json()) as { id: string };
      toast.success(t("importSuccess"));
      onOpenChange(false);
      onImported?.(id);
      router.push(`/chat/${id}`);
    } catch (err) {
      console.error("Error importing chat:", err);
      toast.error(t("importError"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("importChat")}</DialogTitle>
          <DialogDescription>{t("importDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="justify-start h-auto py-3 px-4 gap-3"
          >
            <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="text-sm font-medium">{t("importSelectFile")}</span>
              <span className="text-xs text-muted-foreground">
                {t("importFileHint")}
              </span>
            </span>
            {importing && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
