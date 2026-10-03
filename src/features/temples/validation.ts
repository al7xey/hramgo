import { z } from "zod";

const serviceKindSchema = z.enum([
  "sundaySchool",
  "adultSchool",
  "youth",
  "social",
  "refectory",
  "cafe",
  "shop",
  "choir",
  "pilgrimage",
  "meetings",
  "other"
]);

const stringArray = (max = 120) =>
  z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value.filter(Boolean);
      }

      return value ? [value] : undefined;
    },
    z.array(z.string().trim().min(1).max(max)).optional()
  );
const booleanParam = z.preprocess((value) => value === true || value === "true" || value === "1", z.boolean());

export const templeSearchSchema = z.object({
  query: z.string().trim().max(120).optional().catch(undefined),
  district: stringArray(80).catch(undefined),
  metro: stringArray(80).catch(undefined),
  metroLine: stringArray(10).catch(undefined),
  service: z
    .preprocess(
      (value) => {
        if (Array.isArray(value)) {
          return value.filter(Boolean);
        }

        return value ? [value] : undefined;
      },
      z.array(serviceKindSchema).optional()
    )
    .catch(undefined),
  objectType: z.enum(["all", "church", "monastery"]).optional().catch("all"),
  liturgyTime: z.string().regex(/^\d{1,2}:?\d{0,2}$/u).optional().catch(undefined),
  eveningTime: z.string().regex(/^\d{1,2}:?\d{0,2}$/u).optional().catch(undefined),
  sundaySchool: booleanParam,
  hasSchedule: booleanParam,
  hasWebsite: booleanParam,
  hasPhotos: booleanParam,
  childFriendly: booleanParam,
  hasParking: booleanParam,
  sort: z
    .enum(["relevance", "distance", "alphabet", "sundaySchool", "impressions"])
    .optional()
    .catch("relevance"),
  latitude: z.coerce.number().min(55).max(56.2).optional().catch(undefined),
  longitude: z.coerce.number().min(36.5).max(38).optional().catch(undefined),
  radiusKm: z.coerce.number().min(1).max(50).optional().catch(undefined)
});

export const nearbySearchSchema = z.object({
  latitude: z.coerce.number().min(55).max(56.2),
  longitude: z.coerce.number().min(36.5).max(38),
  radiusKm: z.coerce.number().min(1).max(50).default(8)
});

export type TempleSearchSchema = z.infer<typeof templeSearchSchema>;
