"use client";
import { useTranslations } from "next-intl";

export const ProjectOverview = ({
  onSendSuggestion,
}: {
  onSendSuggestion?: (text: string) => void;
}) => {
  const t = useTranslations("chat");

  const suggestions = t.raw("initialSuggestions") as string[];

  return (
    <div className="flex flex-col items-center justify-end">
      <h1 className="text-3xl font-semibold mb-6">MceChat AI</h1>
      {onSendSuggestion && (
        <div className="w-full">
          <div className="text-center text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            {t("initialSuggestionsLabel")}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSendSuggestion(suggestion)}
                className="rounded-full border border-border/80 bg-background/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-left text-sm text-foreground/80 px-4 py-2 transition-colors duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
