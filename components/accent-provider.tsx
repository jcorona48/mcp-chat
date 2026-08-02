"use client";

import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export const ACCENT_HUE_KEY = "accent-hue";
export const DEFAULT_ACCENT_HUE = 157.5;

export interface AccentOption {
  key: string;
  hue: number;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { key: "green", hue: 157.5 },
  { key: "blue", hue: 230 },
  { key: "violet", hue: 280 },
  { key: "pink", hue: 330 },
  { key: "orange", hue: 45 },
  { key: "red", hue: 15 },
];

interface AccentContextType {
  hue: number;
  accentKey: string;
  setHue: (hue: number) => void;
  setAccentKey: (key: string) => void;
  resetAccent: () => void;
}

const AccentContext = createContext<AccentContextType | undefined>(undefined);

export function hueToHex(hue: number): string {
  const s = 100;
  const l = 50;
  const h = ((hue % 360) + 360) % 360;
  const c = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHue(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return DEFAULT_ACCENT_HUE;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  let h: number;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return Math.round(((h * 60) + 360) % 360);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [hue, setHue] = useLocalStorage<number>(ACCENT_HUE_KEY, DEFAULT_ACCENT_HUE);

  const accentKey =
    ACCENT_OPTIONS.find((o) => Math.round(o.hue) === Math.round(hue))?.key ??
    "custom";

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent-hue",
      String(hue),
    );
  }, [hue]);

  const setAccentKey = (key: string) => {
    const option = ACCENT_OPTIONS.find((o) => o.key === key);
    if (option) setHue(option.hue);
  };

  const resetAccent = () => setHue(DEFAULT_ACCENT_HUE);

  return (
    <AccentContext.Provider
      value={{ hue, accentKey, setHue, setAccentKey, resetAccent }}
    >
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  const context = useContext(AccentContext);
  if (context === undefined) {
    throw new Error("useAccent must be used within an AccentProvider");
  }
  return context;
}
