"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleDashed, Flame, Palette, Sun, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { PaletteDialog } from "./palette-dialog";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  ...props
}: React.ComponentProps<typeof Button> & { title?: string }) {
  const t = useTranslations("theme");
  const tUser = useTranslations("userMenu");
  const { setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(`rounded-md w-full flex justify-between`, className)}
            {...props}
          >
            <div className="flex gap-4">
              <Sparkles className="h-4 w-4 hover:text-sidebar-accent" />
              {tUser("theme")}
            </div>
            <Flame className="h-4 w-4 rotate-0 scale-100 transition-all light:scale-0 light:-rotate-90 black:scale-0 black:-rotate-90 hover:text-sidebar-accent" />
            <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all light:rotate-0 light:scale-100 black:scale-0 black:rotate-0 hover:text-sidebar-accent" />
            <CircleDashed className="absolute h-4 w-4 rotate-90 scale-0 transition-all black:rotate-0 black:scale-100 light:scale-0 light:rotate-0 hover:text-sidebar-accent" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setTheme("dark")}>
            <Flame className="mr-2 h-4 w-4" />
            <span>{t("dark")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            <span>{t("light")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTheme("black")}>
            <CircleDashed className="mr-2 h-4 w-4" />
            <span>{t("black")}</span>
          </DropdownMenuItem>
          {/* sunset theme */}
          <DropdownMenuItem onSelect={() => setTheme("sunset")}>
            <Sun className="mr-2 h-4 w-4" />
            <span>{t("sunset")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPaletteOpen(true)}>
            <Palette className="mr-2 h-4 w-4" />
            <span>{t("palette")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PaletteDialog open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
