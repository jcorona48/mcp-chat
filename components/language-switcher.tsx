"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  isCollapsed?: boolean;
}

export function LanguageSwitcher({ className, isCollapsed }: LanguageSwitcherProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
      
  const languages = [
    { code: "es", label: "Español" },
    { code: "en", label: "English" },
  ];

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
     
      window.location.reload();
    });
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-4 w-full justify-start", className)}
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
            {languages.find((l) => l.code === locale)?.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              locale === lang.code ? "bg-accent" : ""
            )}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
