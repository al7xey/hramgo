import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export function formatRobokassaAmount(amount: number) {
  return amount.toFixed(2);
}

export function createRobokassaInvoiceId() {
  return `${Date.now()}${randomInt(100, 999)}`;
}

export function signRobokassa(parts: string[]) {
  return createHash(env.ROBOKASSA_HASH_ALGORITHM).update(parts.join(":")).digest("hex");
}

export function safeCompareSignature(left: string, right: string) {
  const leftBuffer = Buffer.from(left.toLowerCase());
  const rightBuffer = Buffer.from(right.toLowerCase());

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildRobokassaPaymentUrl({
  amount,
  description,
  email,
  invoiceId
}: {
  amount: string;
  description: string;
  email: string;
  invoiceId: string;
}) {
  if (!env.ROBOKASSA_MERCHANT_LOGIN || !env.ROBOKASSA_PASSWORD_1) {
    throw new Error("Robokassa credentials are not configured");
  }

  const signature = signRobokassa([env.ROBOKASSA_MERCHANT_LOGIN, amount, invoiceId, env.ROBOKASSA_PASSWORD_1]);
  const paymentUrl = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
  paymentUrl.searchParams.set("MerchantLogin", env.ROBOKASSA_MERCHANT_LOGIN);
  paymentUrl.searchParams.set("OutSum", amount);
  paymentUrl.searchParams.set("InvId", invoiceId);
  paymentUrl.searchParams.set("Description", description);
  paymentUrl.searchParams.set("SignatureValue", signature);
  paymentUrl.searchParams.set("Culture", "ru");
  paymentUrl.searchParams.set("Email", email);

  if (env.ROBOKASSA_IS_TEST === "true") {
    paymentUrl.searchParams.set("IsTest", "1");
  }

  return { paymentUrl, signature };
}

export function verifyRobokassaResultSignature(outSum: string, invId: string, signature: string) {
  if (!env.ROBOKASSA_PASSWORD_2) {
    return false;
  }

  const expected = signRobokassa([outSum, invId, env.ROBOKASSA_PASSWORD_2]).toLowerCase();
  return safeCompareSignature(signature, expected);
}
