"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { AI_SYSTEM_PROMPT_KEY } from "@/lib/ai/types";
import { toast } from "sonner";

export function SystemPromptDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("systemPrompt");
  const [savedPrompt, setSavedPrompt] = useLocalStorage<string>(
    AI_SYSTEM_PROMPT_KEY,
    "",
  );
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(savedPrompt);
    }
  }, [open, savedPrompt]);

  const handleSave = () => {
    setSavedPrompt(draft.trim());
    onOpenChange(false);
    toast.success(t("saved"));
  };

  const handleReset = () => {
    setDraft("");
    setSavedPrompt("");
    toast.success(t("resetDone"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("placeholder")}
            className="min-h-[220px] text-sm"
          />
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            {t("reset")}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
