import { env } from "@/lib/env";

export function getMissingSupportPaymentConfig() {
  const missing: string[] = [];

  if (!env.MIN_SUPPORT_AMOUNT_RUB) missing.push("MIN_SUPPORT_AMOUNT_RUB");
  if (!env.MAX_SUPPORT_AMOUNT_RUB) missing.push("MAX_SUPPORT_AMOUNT_RUB");
  if (!env.RETURN_REQUEST_REVIEW_DAYS) missing.push("RETURN_REQUEST_REVIEW_DAYS");
  if (!env.RETURN_PAYMENT_DAYS) missing.push("RETURN_PAYMENT_DAYS");
  if (!env.LEGAL_FULL_NAME) missing.push("LEGAL_FULL_NAME");
  if (!env.LEGAL_INN) missing.push("LEGAL_INN");
  if (!env.SUPPORT_EMAIL) missing.push("SUPPORT_EMAIL");
  if (!env.ROBOKASSA_MERCHANT_LOGIN) missing.push("ROBOKASSA_MERCHANT_LOGIN");
  if (!env.ROBOKASSA_PASSWORD_1) missing.push("ROBOKASSA_PASSWORD_1");
  if (!env.ROBOKASSA_PASSWORD_2) missing.push("ROBOKASSA_PASSWORD_2");

  return missing;
}

export function isSupportPaymentConfigured() {
  return getMissingSupportPaymentConfig().length === 0;
}
