export function LoadingState({ label = "Загрузка" }: { label?: string }) {
  return (
    <div
      className="grid gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm text-muted-foreground">{label}…</p>
      <div
        className="h-[224px] animate-pulse rounded-glass bg-muted"
        aria-hidden
      />
      <div
        className="h-[224px] animate-pulse rounded-glass bg-muted"
        aria-hidden
      />
    </div>
  );
}
