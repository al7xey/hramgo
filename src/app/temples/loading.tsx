export default function TemplesLoading() {
  return (
    <div className="grid animate-pulse gap-5 lg:grid-cols-[320px_1fr]" aria-label="Загрузка поиска храмов">
      <div className="grid content-start gap-4">
        <div className="h-10 w-64 rounded-lg bg-muted" />
        <div className="h-24 rounded-[24px] bg-muted" />
        <div className="h-14 rounded-[24px] bg-muted" />
      </div>
      <div className="grid content-start gap-3">
        <div className="h-5 w-28 rounded bg-muted" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-52 rounded-[28px] bg-muted" />
        ))}
      </div>
    </div>
  );
}
