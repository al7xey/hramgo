import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

const paymentSchema = z.object({
  amount: z.coerce.number().min(50).max(150000),
  email: z.string().trim().email(),
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

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function createSignature(parts: string[]) {
  return createHash(env.ROBOKASSA_HASH_ALGORITHM).update(parts.join(":")).digest("hex");
}

function createInvoiceId() {
  return `${Date.now()}${randomInt(100, 999)}`;
}

export async function POST(request: Request) {
  try {
    const payload = paymentSchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json({ message: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    }

    if (!env.ROBOKASSA_MERCHANT_LOGIN || !env.ROBOKASSA_PASSWORD_1) {
      return NextResponse.json({ message: "Оплата через Robokassa временно недоступна." }, { status: 503 });
    }

    const amount = formatAmount(payload.amount);
    const invoiceId = createInvoiceId();
    const description = "Поддержка проекта HramGo";
    const signature = createSignature([env.ROBOKASSA_MERCHANT_LOGIN, amount, invoiceId, env.ROBOKASSA_PASSWORD_1]);

    await prisma.supportPayment.create({
      data: {
        provider: "robokassa",
        providerInvoiceId: invoiceId,
        amount: payload.amount,
        email: payload.email,
        signature,
        status: "PENDING"
      }
    });

    const paymentUrl = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
    paymentUrl.searchParams.set("MerchantLogin", env.ROBOKASSA_MERCHANT_LOGIN);
    paymentUrl.searchParams.set("OutSum", amount);
    paymentUrl.searchParams.set("InvId", invoiceId);
    paymentUrl.searchParams.set("Description", description);
    paymentUrl.searchParams.set("SignatureValue", signature);
    paymentUrl.searchParams.set("Culture", "ru");
    paymentUrl.searchParams.set("Email", payload.email);

    if (env.ROBOKASSA_IS_TEST === "true") {
      paymentUrl.searchParams.set("IsTest", "1");
    }

    return NextResponse.json({ confirmationUrl: paymentUrl.toString() });
  } catch (error) {
    return badRequest(error);
  }
}
