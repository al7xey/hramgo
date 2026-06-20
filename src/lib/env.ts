import { z } from "zod";

const positiveNumberDefault = (defaultValue: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().positive().default(defaultValue));
const positiveIntDefault = (defaultValue: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().positive().default(defaultValue));

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  MAPS_API_KEY: z.string().optional(),
  GEOCODER_API_KEY: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.string().optional(),
  REVIEW_MODERATION_REQUIRED: z.string().default("true"),
  AUTO_APPROVE_SAFE_REVIEWS: z.string().default("false"),
  MAX_REVIEW_PHOTOS: z.coerce.number().default(10),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(8),
  APP_DOMAIN: z.string().default("https://hramgo.ru"),
  USE_DEMO_DATA: z.string().default(process.env.DATABASE_URL ? "false" : "true"),
  YOOKASSA_SHOP_ID: z.string().default("1388625"),
  YOOKASSA_SECRET_KEY: z.string().optional(),
  YOOKASSA_RECEIPT_ITEM_NAME: z.string().optional(),
  YOOKASSA_PAYMENT_SUBJECT: z.string().default("service"),
  YOOKASSA_PAYMENT_MODE: z.string().default("full_payment"),
  YOOKASSA_VAT_CODE: z.coerce.number().int().positive().default(1),
  YOOKASSA_LEGAL_ID: z.string().default("LB0003357423"),
  YOOKASSA_SBP_MERCHANT_ID: z.string().default("MB0002928350"),
  YOOKASSA_MCC: z.string().default("9999"),
  ROBO_FISCALIZATION_ENABLED: z.string().default("false"),
  ROBO_FISCALIZATION_MODE: z.string().optional(),
  ROBO_RECEIPT_ITEM_NAME: z.string().optional(),
  SUPPORT_EMAIL_FROM: z.string().optional(),
  SUPPORT_EMAIL_REPLY_TO: z.string().optional(),
  SUPPORT_EMAIL_TRANSPORT: z.string().optional(),
  MIN_SUPPORT_AMOUNT_RUB: positiveNumberDefault(100),
  MAX_SUPPORT_AMOUNT_RUB: positiveNumberDefault(100000),
  RETURN_REQUEST_REVIEW_DAYS: positiveIntDefault(10),
  RETURN_PAYMENT_DAYS: positiveIntDefault(10),
  LEGAL_FULL_NAME: z.string().default("Семенов Алексей Витальевич"),
  LEGAL_INN: z.string().default("301612256922"),
  SUPPORT_EMAIL: z.string().email().default("hram-go@yandex.ru"),
  SUPPORT_PHONE: z.string().optional(),
  LEGAL_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_LEGAL_OPERATOR_NAME: z.string().default("HramGo"),
  NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_LEGAL_OPERATOR_INN: z.string().optional(),
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: z.string().email().default("support@hramgo.ru"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default("support@hramgo.ru")
});

export const env = envSchema.parse(process.env);

export const shouldUseDemoData = env.USE_DEMO_DATA !== "false";
