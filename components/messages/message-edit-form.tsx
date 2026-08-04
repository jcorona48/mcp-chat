"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";

export function MessageEditForm({
  initialText,
  onSubmit,
  onCancel,
}: {
  initialText: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("common");
  const [draft, setDraft] = useState(initialText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSubmit(draft);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl"
    >
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        rows={Math.min(8, Math.max(2, draft.split("\n").length))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        className="w-full resize-y bg-transparent text-sm focus:outline-none"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-2 text-muted-foreground hover:bg-foreground/5 transition-colors"
          aria-label={t("cancelEdit")}
        >
          <XIcon className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
          aria-label={t("sendEdit")}
        >
          <CheckIcon className="h-4 w-4 text-primary-foreground" />
        </button>
      </div>
    </form>
  );
}
