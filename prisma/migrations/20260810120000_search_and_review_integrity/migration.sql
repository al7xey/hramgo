CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Temple_name_trgm_idx"
ON "Temple" USING GIN (lower("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Temple_shortName_trgm_idx"
ON "Temple" USING GIN (lower(COALESCE("shortName", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Temple_address_trgm_idx"
ON "Temple" USING GIN (lower(COALESCE("address", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Temple_district_trgm_idx"
ON "Temple" USING GIN (lower(COALESCE("district", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "TempleTransit_station_trgm_idx"
ON "TempleTransit" USING GIN (lower("station") gin_trgm_ops);

WITH "rankedActiveReviews" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId", "templeId"
      ORDER BY COALESCE("publishedAt", "createdAt") DESC, "createdAt" DESC, "id" DESC
    ) AS "position"
  FROM "Review"
  WHERE "status" IN ('PENDING', 'APPROVED', 'NEEDS_REVIEW')
)
UPDATE "Review" AS "review"
SET "status" = 'HIDDEN', "editedAt" = NOW()
FROM "rankedActiveReviews" AS "ranked"
WHERE "review"."id" = "ranked"."id"
  AND "ranked"."position" > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_templeId_active_key"
ON "Review" ("userId", "templeId")
WHERE "status" IN ('PENDING', 'APPROVED', 'NEEDS_REVIEW');

WITH "reviewStats" AS (
  SELECT
    "templeId",
    COUNT(*)::integer AS "total",
    AVG("rating")::double precision AS "average",
    COUNT(*) FILTER (WHERE "rating" = 5)::integer AS "rating5",
    COUNT(*) FILTER (WHERE "rating" = 4)::integer AS "rating4",
    COUNT(*) FILTER (WHERE "rating" = 3)::integer AS "rating3",
    COUNT(*) FILTER (WHERE "rating" = 2)::integer AS "rating2",
    COUNT(*) FILTER (WHERE "rating" = 1)::integer AS "rating1"
  FROM "Review"
  WHERE "status" = 'APPROVED'
  GROUP BY "templeId"
)
UPDATE "Temple" AS "temple"
SET
  "reviewsCount" = "stats"."total",
  "approvedReviewsCount" = "stats"."total",
  "averageHelpfulnessRating" = "stats"."average",
  "rating5Count" = "stats"."rating5",
  "rating4Count" = "stats"."rating4",
  "rating3Count" = "stats"."rating3",
  "rating2Count" = "stats"."rating2",
  "rating1Count" = "stats"."rating1"
FROM "reviewStats" AS "stats"
WHERE "temple"."id" = "stats"."templeId";

UPDATE "Temple" AS "temple"
SET
  "reviewsCount" = 0,
  "approvedReviewsCount" = 0,
  "averageHelpfulnessRating" = 0,
  "rating5Count" = 0,
  "rating4Count" = 0,
  "rating3Count" = 0,
  "rating2Count" = 0,
  "rating1Count" = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM "Review" AS "review"
  WHERE "review"."templeId" = "temple"."id"
    AND "review"."status" = 'APPROVED'
);
