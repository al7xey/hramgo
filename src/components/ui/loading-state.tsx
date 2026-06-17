export function LoadingState({ label = "Загрузка" }: { label?: string }) {
  return (
    <div className="grid gap-3" aria-label={label}>
      <div className="h-24 animate-pulse rounded-glass bg-muted" />
      <div className="h-24 animate-pulse rounded-glass bg-muted" />
      <div className="h-24 animate-pulse rounded-glass bg-muted" />
    </div>
  );
}
