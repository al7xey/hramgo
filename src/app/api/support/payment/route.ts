import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { badRequest } from "@/lib/api/response";

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

export async function POST(request: Request) {
  try {
    const payload = paymentSchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json({ message: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    }

    if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
      return NextResponse.json({ message: "Оплата временно недоступна" }, { status: 503 });
    }

    const body: Record<string, unknown> = {
      amount: {
        value: payload.amount.toFixed(2),
        currency: "RUB"
      },
      capture: true,
      description: "Поддержка проекта HramGo",
      confirmation: {
        type: "redirect",
        return_url: `${env.APP_DOMAIN}/support?status=success`
      },
      metadata: {
        project: "hramgo",
        email: payload.email
      },
      receipt:
        env.YOOKASSA_RECEIPTS_ENABLED === "true"
          ? {
              customer: {
                email: payload.email
              },
              items: [
                {
                  description: "Поддержка проекта HramGo",
                  quantity: "1.00",
                  amount: {
                    value: payload.amount.toFixed(2),
                    currency: "RUB"
                  },
                  vat_code: Number(env.YOOKASSA_VAT_CODE),
                  payment_subject: env.YOOKASSA_PAYMENT_SUBJECT,
                  payment_mode: "full_payment"
                }
              ]
            }
          : undefined
    };

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotence-key": crypto.randomUUID(),
        authorization: `Basic ${Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString("base64")}`
      },
      body: JSON.stringify(body)
    });

    const result = (await response.json()) as { confirmation?: { confirmation_url?: string }; description?: string };

    if (!response.ok || !result.confirmation?.confirmation_url) {
      return NextResponse.json({ message: result.description ?? "Не удалось создать платеж" }, { status: 502 });
    }

    return NextResponse.json({ confirmationUrl: result.confirmation.confirmation_url });
  } catch (error) {
    return badRequest(error);
  }
}
