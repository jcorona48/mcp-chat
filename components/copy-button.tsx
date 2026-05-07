import { useTranslations } from "next-intl";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "@/lib/hooks/use-copy";
import { Button } from "./ui/button";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const t = useTranslations("common");
  const { copied, copy } = useCopy();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "transition-opacity opacity-0 group-hover/message:opacity-100 gap-1.5",
        className
      )}
      onClick={() => copy(text)}
      title={t("copyToClipboard")}
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" />
          <span className="text-xs">{t("copied")}</span>
        </>
      ) : (
        <>
          <CopyIcon className="h-4 w-4" />
          <span className="text-xs">{t("copy")}</span>
        </>
      )}
    </Button>
  );
}
