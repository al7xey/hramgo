import { NextRequest } from "next/server";

import { getNearestTransitList } from "@/features/temples/transit";
import { listMapTemples } from "@/features/temples/repository";
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

  return ok({
    items: temples
      .filter((temple) => temple.latitude && temple.longitude)
      .map((temple) => ({
        id: temple.id,
        slug: temple.slug,
        name: temple.name,
        shortName: temple.shortName,
        latitude: temple.latitude,
        longitude: temple.longitude,
        websiteUrl: temple.websiteUrl,
        address: temple.address,
        photos: temple.photos.slice(0, 1),
        transit: getNearestTransitList(temple.transit, 2)
      }))
  }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    }
  });
}
