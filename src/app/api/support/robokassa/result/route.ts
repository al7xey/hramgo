import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

function sign(parts: string[]) {
  return createHash(env.ROBOKASSA_HASH_ALGORITHM).update(parts.join(":")).digest("hex").toLowerCase();
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left.toLowerCase());
  const rightBuffer = Buffer.from(right.toLowerCase());

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function handleRobokassaResult(request: NextRequest) {
  if (!env.ROBOKASSA_PASSWORD_2) {
    return new NextResponse("Robokassa password is not configured", { status: 503 });
  }

  const form = request.method === "POST" ? await request.formData() : request.nextUrl.searchParams;
  const outSum = String(form.get("OutSum") ?? "");
  const invId = String(form.get("InvId") ?? "");
  const signature = String(form.get("SignatureValue") ?? "");
  const expected = sign([outSum, invId, env.ROBOKASSA_PASSWORD_2]);

  if (!outSum || !invId || !signature || !safeEqual(signature, expected)) {
    return new NextResponse("bad sign", { status: 400 });
  }

  await prisma.supportPayment.updateMany({
    where: { provider: "robokassa", providerInvoiceId: invId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      rawPayload: Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]))
    }
  });

  return new NextResponse(`OK${invId}`);
}

export async function GET(request: NextRequest) {
  return handleRobokassaResult(request);
}

export async function POST(request: NextRequest) {
  return handleRobokassaResult(request);
}
