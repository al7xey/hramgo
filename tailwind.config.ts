import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./prisma/**/*.{ts,tsx}", "./scripts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-border": "var(--card-border)",
        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        surface: "var(--surface)"
      },
      borderRadius: {
        glass: "28px",
        shell: "32px"
      },
      boxShadow: {
        glass: "0 20px 70px rgba(54, 122, 178, 0.14)",
        "glass-dark": "0 24px 80px rgba(0, 0, 0, 0.28)"
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "Arial", "sans-serif"]
      },
      keyframes: {
        "soft-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "soft-in": "soft-in 420ms ease-out both"
      }
    }
  },
  plugins: [typography]
};

export default config;
