import type { NextRequest } from "next/server";

import { listNearbyTemples, toTempleCardDto } from "@/features/temples/repository";
import { nearbySearchSchema } from "@/features/temples/validation";
import { badRequest, ok } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const input = nearbySearchSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const temples = await listNearbyTemples(input);

    return ok({ temples: temples.map(toTempleCardDto), count: temples.length });
  } catch (error) {
    return badRequest(error);
  }
}
