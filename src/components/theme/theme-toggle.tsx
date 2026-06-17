"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useContext } from "react";

import { ThemeContext } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Темная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor }
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-card-border bg-muted p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={theme === option.value ? "primary" : "ghost"}
          size="sm"
          className={cn("min-h-10 rounded-[20px] px-1 text-xs", theme !== option.value && "text-muted-foreground")}
          onClick={() => {
            localStorage.setItem("hramgo-theme", option.value);
            setTheme(option.value);
          }}
          aria-label={option.label}
        >
          <option.icon className="size-4" aria-hidden />
          <span className="hidden sm:inline">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}
