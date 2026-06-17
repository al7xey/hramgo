import { Badge } from "@/components/ui/badge";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

const jobs = [
  { type: "import:official-list", status: "ready", note: "Импорт официального списка" },
  { type: "discover:websites", status: "ready", note: "Поиск сайтов приходов" },
  { type: "extract:llm", status: "manual_review", note: "Извлечение с evidence" },
  { type: "geocode:temples", status: "ready", note: "Геокодинг адресов" }
];

export function AdminImportJobsTable() {
  return (
    <LiquidGlassCard className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-card-border text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Скрипт</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Назначение</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.type} className="border-b border-card-border/60 last:border-b-0">
              <td className="px-4 py-3 font-mono text-xs">{job.type}</td>
              <td className="px-4 py-3">
                <Badge tone={job.status === "manual_review" ? "warning" : "success"}>{job.status}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{job.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LiquidGlassCard>
  );
}
