import { z } from "zod";

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
  USE_DEMO_DATA: z.string().default("true"),
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),
  YOOKASSA_RECEIPTS_ENABLED: z.string().default("false"),
  YOOKASSA_VAT_CODE: z.string().default("1"),
  YOOKASSA_PAYMENT_SUBJECT: z.string().default("service"),
  NEXT_PUBLIC_LEGAL_OPERATOR_NAME: z.string().default("HramGo"),
  NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_LEGAL_OPERATOR_INN: z.string().optional(),
  NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: z.string().email().default("support@hramgo.ru"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default("support@hramgo.ru")
});

export const env = envSchema.parse(process.env);

export const shouldUseDemoData = env.USE_DEMO_DATA !== "false";
