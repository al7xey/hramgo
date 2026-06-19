import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { formatRobokassaAmount, supportPaymentStatus, verifyRobokassaResultSignature } from "@/lib/payments/robokassa";

async function handleRobokassaResult(request: NextRequest) {
  if (!env.ROBOKASSA_PASSWORD_2) {
    return new NextResponse("temporarily unavailable", { status: 503 });
  }

  const form = request.method === "POST" ? await request.formData() : request.nextUrl.searchParams;
  const outSum = String(form.get("OutSum") ?? "");
  const invId = String(form.get("InvId") ?? "");
  const signature = String(form.get("SignatureValue") ?? "");

  if (!outSum || !invId || !signature || !verifyRobokassaResultSignature(outSum, invId, signature)) {
    return new NextResponse("invalid request", { status: 400 });
  }

  const payment = await prisma.supportPayment.findUnique({
    where: { providerInvoiceId: invId }
  });

  if (!payment || payment.provider !== "robokassa") {
    return new NextResponse("not found", { status: 404 });
  }

  if (formatRobokassaAmount(payment.amount) !== formatRobokassaAmount(Number(outSum))) {
    await prisma.supportPayment.update({
      where: { providerInvoiceId: invId },
      data: {
        status: supportPaymentStatus.error,
        rawPayload: Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]))
      }
    });
    return new NextResponse("invalid request", { status: 400 });
  }

  if (payment.status !== supportPaymentStatus.paid) {
    await prisma.supportPayment.update({
      where: { providerInvoiceId: invId },
      data: {
        status: supportPaymentStatus.paid,
        paidAt: payment.paidAt ?? new Date(),
        rawPayload: Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]))
      }
    });
  }

  return new NextResponse(`OK${invId}`);
}

export async function GET(request: NextRequest) {
  return handleRobokassaResult(request);
}

export async function POST(request: NextRequest) {
  return handleRobokassaResult(request);
}
