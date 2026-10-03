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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v).optional().catch(undefined),
  timeFrom: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional().catch(undefined),
  timeTo: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional().catch(undefined),
  worship: z.enum(['liturgy','evening','vigil','confession','prayer']).optional().catch(undefined),
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
    .enum(["relevance", "distance", "alphabet", "sundaySchool"])
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
