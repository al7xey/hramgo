import { ok, actionQueued } from "@/lib/api/response";

export async function GET() {
  return ok({
    jobs: [
      "import:official-list",
      "discover:websites",
      "crawl:temple",
      "extract:llm",
      "geocode:temples",
      "moderation:queue"
    ]
  });
}

export async function POST() {
  return actionQueued("Задача импорта поставлена в очередь");
}
