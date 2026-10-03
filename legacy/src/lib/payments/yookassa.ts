import { randomUUID } from "node:crypto";

import { env } from "@/lib/env";

export const supportPaymentStatus = {
  pending: "PENDING",
  paid: "PAID",
  cancelled: "CANCELLED",
  error: "ERROR",
  refundRequested: "REFUND_REQUESTED",
  refunded: "REFUNDED"
} as const;

type YooKassaPayment = {
  id: string;
  status: string;
  paid?: boolean;
  confirmation?: {
    type?: string;
    confirmation_url?: string;
  };
};

export function formatYooKassaAmount(amount: number) {
  return amount.toFixed(2);
}

export function createYooKassaIdempotenceKey() {
  return randomUUID();
}

export function mapYooKassaStatus(status?: string) {
  switch (status) {
    case "succeeded":
      return supportPaymentStatus.paid;
    case "canceled":
      return supportPaymentStatus.cancelled;
    case "pending":
    case "waiting_for_capture":
      return supportPaymentStatus.pending;
    default:
      return supportPaymentStatus.error;
  }
}

export async function createYooKassaPayment({
  amount,
  description,
  email,
  idempotenceKey
}: {
  amount: string;
  description: string;
  email: string;
  idempotenceKey: string;
}) {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    throw new Error("YooKassa credentials are not configured");
  }

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString("base64")}`,
      "content-type": "application/json",
      "idempotence-key": idempotenceKey
    },
    body: JSON.stringify({
      amount: {
        value: amount,
        currency: "RUB"
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${env.APP_DOMAIN}/support?status=success`
      },
      description,
      receipt: {
        customer: {
          email
        },
        items: [
          {
            description,
            quantity: "1.00",
            amount: {
              value: amount,
              currency: "RUB"
            },
            vat_code: env.YOOKASSA_VAT_CODE,
            payment_subject: env.YOOKASSA_PAYMENT_SUBJECT,
            payment_mode: env.YOOKASSA_PAYMENT_MODE
          }
        ]
      },
      metadata: {
        email
      }
    })
  });

  const payload = (await response.json()) as YooKassaPayment & { description?: string };

  if (!response.ok) {
    throw new Error(`YooKassa payment error: ${response.status}`);
  }

  if (!payload.confirmation?.confirmation_url) {
    throw new Error("YooKassa confirmation URL is missing");
  }

  return {
    paymentId: payload.id,
    status: mapYooKassaStatus(payload.status),
    confirmationUrl: payload.confirmation.confirmation_url,
    rawPayload: payload
  };
}

export async function fetchYooKassaPayment(paymentId: string) {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    throw new Error("YooKassa credentials are not configured");
  }

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      authorization: `Basic ${Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString("base64")}`
    }
  });

  if (!response.ok) {
    throw new Error(`YooKassa payment fetch error: ${response.status}`);
  }

  return (await response.json()) as YooKassaPayment;
}
