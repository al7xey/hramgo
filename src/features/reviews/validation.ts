import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1),
  visitType: z.enum(["SERVICE", "EXCURSION", "SUNDAY_SCHOOL", "PERSONAL_VISIT", "EVENT", "OTHER"]),
  visitDate: z
    .string()
    .date()
    .optional()
    .refine((value) => !value || new Date(value) <= new Date(), "Дата посещения не может быть в будущем"),
  tags: z.array(z.string().trim().max(50)).max(8).default([]),
  photos: z.array(z.string().url()).max(10).default([]),
  personalDataConsent: z.literal(true, {
    error: "Нужно согласие на обработку персональных данных"
  }),
  accessibilityRating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  territoryRating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  informationRating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  sundaySchoolRating: z.coerce.number().int().min(1).max(5).nullable().optional()
});

export const reviewReportSchema = z.object({
  reason: z.string().trim().min(3).max(120),
  comment: z.string().trim().max(1000).optional()
});
