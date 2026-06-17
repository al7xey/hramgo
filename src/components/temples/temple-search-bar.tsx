import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TempleSearchBar({
  defaultValue,
  action = "/temples",
  autoFocus = false
}: {
  defaultValue?: string;
  action?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action={action} className="grid min-w-0 gap-3">
      <label className="relative block">
        <span className="sr-only">Поиск храма</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          name="query"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Название, метро или район"
          className="h-12 w-full min-w-0 rounded-[22px] border border-card-border bg-card px-12 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
      </label>
      <Button type="submit" size="lg" className="w-full">
        Найти храм
      </Button>
    </form>
  );
}
