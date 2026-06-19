import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { fetchYooKassaPayment, mapYooKassaStatus, supportPaymentStatus } from "@/lib/payments/yookassa";

type YooKassaWebhookPayload = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    paid?: boolean;
    amount?: {
      value?: string;
      currency?: string;
    };
  };
};

export async function POST(request: Request) {
  const payload = (await request.json()) as YooKassaWebhookPayload;
  const paymentId = payload.object?.id;

  if (!paymentId) {
    return new NextResponse("invalid request", { status: 400 });
  }

  const payment = await prisma.supportPayment.findUnique({
    where: { providerInvoiceId: paymentId }
  });

  if (!payment || payment.provider !== "yookassa") {
    return new NextResponse("not found", { status: 404 });
  }

  const verifiedPayment = await fetchYooKassaPayment(paymentId);
  const verifiedAmount = Number(verifiedPaymentAmount(verifiedPayment));

  if (Number.isFinite(verifiedAmount) && payment.amount.toFixed(2) !== verifiedAmount.toFixed(2)) {
    await prisma.supportPayment.update({
      where: { providerInvoiceId: paymentId },
      data: { status: supportPaymentStatus.error, rawPayload: payload }
    });
    return new NextResponse("invalid request", { status: 400 });
  }

  const status = mapYooKassaStatus(verifiedPayment.status);

  if (payment.status !== status) {
    await prisma.supportPayment.update({
      where: { providerInvoiceId: paymentId },
      data: {
        status,
        paidAt: status === supportPaymentStatus.paid ? (payment.paidAt ?? new Date()) : payment.paidAt,
        rawPayload: payload
      }
    });
  }

  return new NextResponse("OK");
}

function verifiedPaymentAmount(payment: unknown) {
  if (!payment || typeof payment !== "object") return "";
  const amount = (payment as { amount?: { value?: string } }).amount;
  return amount?.value ?? "";
}
