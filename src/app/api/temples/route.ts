import type { NextRequest } from "next/server";

import { listTemples } from "@/features/temples/repository";
import { templeSearchSchema } from "@/features/temples/validation";
import { badRequest, ok } from "@/lib/api/response";

const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 36;

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const input = templeSearchSchema.parse({
      query: params.get("query") ?? undefined,
      district: params.getAll("district"),
      metro: params.getAll("metro"),
      metroLine: params.getAll("metroLine"),
      service: params.getAll("service"),
      sundaySchool: params.get("sundaySchool") ?? undefined,
      hasSchedule: params.get("hasSchedule") ?? undefined,
      hasWebsite: params.get("hasWebsite") ?? undefined,
      hasPhotos: params.get("hasPhotos") ?? undefined,
      childFriendly: params.get("childFriendly") ?? undefined,
      hasParking: params.get("hasParking") ?? undefined,
      sort: params.get("sort") ?? undefined
    });

    const cursor = toPositiveInt(params.get("cursor"), 0);
    const limit = Math.min(toPositiveInt(params.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);
    const temples = await listTemples(input);
    const items = temples.slice(cursor, cursor + limit);
    const nextCursor = cursor + items.length < temples.length ? String(cursor + items.length) : null;

    return ok({
      items,
      nextCursor,
      total: temples.length
    });
  } catch (error) {
    return badRequest(error);
  }
}
