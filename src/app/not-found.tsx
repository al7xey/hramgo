import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
export default function NotFound() {
  return (
    <section className="mx-auto grid max-w-xl gap-5 py-8">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="text-muted-foreground">
        Ссылка могла измениться. Попробуйте найти храм по названию, улице или
        станции метро.
      </p>
      <TempleSearchBar />
      <Button asChild variant="outline">
        <Link href="/temples/">Все храмы Москвы</Link>
      </Button>
    </section>
  );
}
