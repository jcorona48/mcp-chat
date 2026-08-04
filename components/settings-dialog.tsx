"use client";

import { useTranslations } from "next-intl";
import {
  ChevronRight,
  Key,
  ServerIcon,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";

export function SettingsDialog({
  open,
  onOpenChange,
  onOpenMCP,
  onOpenAIProvider,
  onOpenSystemPrompt,
  onOpenImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenMCP: () => void;
  onOpenAIProvider: () => void;
  onOpenSystemPrompt: () => void;
  onOpenImport: () => void;
}) {
  const tUser = useTranslations("userMenu");

  const launcherRows: Array<{
    key: string;
    icon: LucideIcon;
    onClick: () => void;
  }> = [
    { key: "mcpSettings", icon: ServerIcon, onClick: onOpenMCP },
    { key: "aiModels", icon: Key, onClick: onOpenAIProvider },
    { key: "systemPrompt", icon: Sparkles, onClick: onOpenSystemPrompt },
    { key: "importConversation", icon: Upload, onClick: onOpenImport },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{tUser("settings")}</DialogTitle>
          <DialogDescription>{tUser("settingsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 py-2">
          {launcherRows.map((row) => {
            const Icon = row.icon;
            return (
              <Button
                key={row.key}
                variant="ghost"
                className="h-auto w-full justify-between rounded-md px-3 py-2.5 text-sm font-normal hover:bg-muted/60"
                onClick={() => {
                  onOpenChange(false);
                  row.onClick();
                }}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {tUser(row.key)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            );
          })}
        </div>
        <div className="grid gap-1 border-t border-border/40 pt-2">
          <ThemeToggle className="h-auto w-full justify-between rounded-md px-3 py-2.5 hover:bg-muted/60" />
          <LanguageSwitcher className="h-auto w-full justify-start rounded-md px-3 py-2.5 hover:bg-muted/60" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
