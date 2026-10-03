"use client";

import { AuthProvider } from "@/lib/auth/client";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { FavoritesProvider } from "@/components/favorites/favorites-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider><ThemeProvider>{children}</ThemeProvider></FavoritesProvider>
    </AuthProvider>
  );
}
