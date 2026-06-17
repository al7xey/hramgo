import { Button } from "@/components/ui/button";

export function ReviewFilters() {
  return (
    <div className="flex flex-wrap gap-2">
      {["Все", "С детьми", "Расписание", "Воскресная школа"].map((item, index) => (
        <Button key={item} variant={index === 0 ? "primary" : "outline"} size="sm">
          {item}
        </Button>
      ))}
    </div>
  );
}
