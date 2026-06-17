import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export default function ProfileSettingsPage() {
  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Настройки</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Выберите удобную тему интерфейса.</p>
      </div>
      <LiquidGlassCard className="p-5">
        <ThemeToggle />
      </LiquidGlassCard>
    </div>
  );
}
