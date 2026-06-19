import { NextRequest } from "next/server";

import { listMapTemples, toTempleMapDto } from "@/features/temples/repository";
import { templeSearchSchema } from "@/features/temples/validation";
import { ok } from "@/lib/api/response";

function getParam(params: URLSearchParams, key: string) {
  return params.get(key) ?? undefined;
}

function getParams(params: URLSearchParams, key: string) {
  const values = params.getAll(key).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = templeSearchSchema.parse({
    query: getParam(params, "query"),
    metro: getParams(params, "metro"),
    metroLine: getParams(params, "metroLine"),
    service: getParams(params, "service"),
    hasSchedule: getParam(params, "hasSchedule"),
    hasWebsite: getParam(params, "hasWebsite"),
    hasPhotos: getParam(params, "hasPhotos")
  });
  const temples = await listMapTemples(parsed);

  const items = temples.filter((temple) => temple.latitude && temple.longitude).map(toTempleMapDto);

  return ok({
    items,
    total: items.length
  }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    }
  });
}
