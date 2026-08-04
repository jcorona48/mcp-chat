import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileChipProps {
  filename?: string;
  fallbackLabel: string;
  isUserMessage?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

export function FileChip({
  filename,
  fallbackLabel,
  isUserMessage,
  onRemove,
  removeLabel,
  className,
}: FileChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs max-w-full",
        isUserMessage &&
          "bg-secondary text-secondary-foreground border-transparent",
        className,
      )}
    >
      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate" title={filename ?? fallbackLabel}>
        {filename || fallbackLabel}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={removeLabel}
          title={removeLabel}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
