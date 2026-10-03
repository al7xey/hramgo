import Link from "next/link";
import { ClipboardEdit, MessageCircle, School } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

export function RepresentativeDashboard({ temple }: { temple: TempleView }) {
  return (
    <div className="grid gap-4">
      <LiquidGlassCard className="p-5">
        <p className="text-sm text-muted-foreground">Представитель храма</p>
        <h2 className="mt-1 text-2xl font-semibold">{temple.shortName ?? temple.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Можно отвечать на отзывы, предлагать правки и помогать поддерживать актуальность информации.
        </p>
      </LiquidGlassCard>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile href="/representative/reviews" icon={MessageCircle} label="Отзывы" />
        <Tile href="/representative/suggestions" icon={ClipboardEdit} label="Предложить правку" />
        <Tile href="/representative/temples" icon={School} label="Данные храма" />
      </div>
    </div>
  );
}

function Tile({ href, icon: Icon, label }: { href: string; icon: typeof MessageCircle; label: string }) {
  return (
    <LiquidGlassCard className="p-4">
      <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-[24px] p-0">
        <Link href={href} className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          {label}
        </Link>
      </Button>
    </LiquidGlassCard>
  );
}
