"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  applyConfigBackup,
  buildConfigBackup,
  parseConfigBackup,
} from "@/lib/config-backup";

export function SettingsBackupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("configBackup");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [includeApiKeys, setIncludeApiKeys] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    const backup = buildConfigBackup(includeApiKeys);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mcechat-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("exportSuccess"));
  };

  const handleImport = async (file: File) => {
    if (importing) return;
    setImporting(true);
    try {
      const text = await file.text();
      const backup = parseConfigBackup(text);
      if (!backup) {
        toast.error(t("importError"));
        return;
      }
      applyConfigBackup(backup);
      toast.success(t("importSuccess"));
      window.location.reload();
    } catch (err) {
      console.error("Error importing config:", err);
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t("exportSection")}
            </Label>
            <label className="flex items-start gap-2 rounded-md border border-border/50 p-3 text-sm">
              <input
                type="checkbox"
                checked={includeApiKeys}
                onChange={(e) => setIncludeApiKeys(e.target.checked)}
                className="accent-primary mt-0.5 h-3.5 w-3.5"
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{t("includeApiKeys")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("includeApiKeysHint")}
                </span>
              </span>
            </label>
            <Button onClick={handleExport} className="justify-self-start gap-1.5">
              <Download className="h-4 w-4" />
              {t("exportButton")}
            </Button>
          </div>

          <div className="grid gap-2 border-t border-border/40 pt-4">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t("importSection")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("importWarning")}</p>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="justify-self-start gap-1.5"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t("importButton")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
