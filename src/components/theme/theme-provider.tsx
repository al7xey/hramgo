"use client";

import React, { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const ThemeContext = React.createContext<{
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}>({
  theme: "light",
  setTheme: () => undefined
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>("light");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("hramgo-theme") as ThemePreference | null) ?? "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersDark = mediaQuery.matches;
    const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);

    root.classList.toggle("dark", shouldUseDark);
    root.dataset.theme = theme;

    if (theme !== "system") {
      return;
    }

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      root.classList.toggle("dark", event.matches);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
