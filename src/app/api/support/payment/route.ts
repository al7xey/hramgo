import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { badRequest } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  buildRobokassaPaymentUrl,
  createRobokassaInvoiceId,
  formatRobokassaAmount,
  supportPaymentStatus
} from "@/lib/payments/robokassa";
import { getMissingSupportPaymentConfig } from "@/lib/support/payment-config";

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  email: z.string().trim().email().optional(),
  personalDataConsent: z.literal(true)
});

const recentRequests = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const requests = (recentRequests.get(key) ?? []).filter((item) => item > windowStart);
  requests.push(now);
  recentRequests.set(key, requests);

  return requests.length > 5;
}

export async function POST(request: Request) {
  try {
    const payload = paymentSchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json({ message: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    }

    const missingConfig = getMissingSupportPaymentConfig();
    if (missingConfig.length > 0) {
      return NextResponse.json({ message: "Оплата временно недоступна. Пожалуйста, попробуйте позже." }, { status: 503 });
    }

    if (payload.amount < env.MIN_SUPPORT_AMOUNT_RUB!) {
      return NextResponse.json({ message: `Минимальная сумма поддержки — ${env.MIN_SUPPORT_AMOUNT_RUB} ₽.` }, { status: 400 });
    }

    if (payload.amount > env.MAX_SUPPORT_AMOUNT_RUB!) {
      return NextResponse.json({ message: `Максимальная сумма поддержки — ${env.MAX_SUPPORT_AMOUNT_RUB} ₽.` }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? payload.email;

    if (!email) {
      return NextResponse.json({ message: "Укажите e-mail для уведомления о платеже." }, { status: 400 });
    }

    const amount = formatRobokassaAmount(payload.amount);
    const invoiceId = createRobokassaInvoiceId();
    const description = "Добровольная поддержка HramGo";
    const { paymentUrl, signature } = buildRobokassaPaymentUrl({ amount, description, email, invoiceId });

    await prisma.supportPayment.create({
      data: {
        provider: "robokassa",
        providerInvoiceId: invoiceId,
        amount: payload.amount,
        email,
        signature,
        status: supportPaymentStatus.pending
      }
    });

    return NextResponse.json({ confirmationUrl: paymentUrl.toString() });
  } catch (error) {
    return badRequest(error);
  }
}
