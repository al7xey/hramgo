import { listTransitStationOptions } from "@/features/temples/repository";
import { ok } from "@/lib/api/response";

export async function GET() {
  const metros = await listTransitStationOptions();

  return ok(
    { metros },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600"
      }
    }
  );
}
