import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { fetchCached, digest } from "./lib/http-cache.mjs";
const temples = JSON.parse(await readFile("data/temples.json", "utf8"));
const photos = [
  ...new Map(
    temples.flatMap((t) => t.photos).map((p) => [p.imageUrl, p])
  ).values()
];
await mkdir("public/photos", { recursive: true });
const records = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (cursor < photos.length) {
      const photo = photos[cursor++];
      const record = {
        sourceUrl: photo.imageUrl,
        photoId: photo.id,
        license: photo.license ?? null
      };
      try {
        const url = new URL(photo.imageUrl);
        if (url.hostname === "sprav.moseparh.ru") {
          url.pathname = url.pathname.replace(/\/([^/]+)$/, "/thumb_$1");
          const result = await fetchCached(url.href, { maxAgeDays: 180 });
          if (!result.body)
            throw new Error(result.error ?? "IMAGE_UNAVAILABLE");
          const dimensions = await sharp(result.body).metadata();
          Object.assign(record, {
            displayUrl: url.href,
            bytes: result.body.length,
            width: dimensions.width,
            height: dimensions.height,
            status: "SOURCE_THUMBNAIL"
          });
        } else if (
          photo.license &&
          /CC BY|Public domain|CC0/i.test(photo.license)
        ) {
          const result = await fetchCached(photo.imageUrl, { maxAgeDays: 365 });
          if (!result.body)
            throw new Error(result.error ?? "IMAGE_UNAVAILABLE");
          const hash = digest(result.body).slice(0, 24),
            variants = [];
          for (const width of [400, 960]) {
            const file = `${hash}-${width}.webp`;
            let bytes;
            try {
              bytes = await readFile("public/photos/" + file);
            } catch {
              bytes = await sharp(result.body)
                .rotate()
                .resize({
                  width,
                  height: width,
                  fit: "inside",
                  withoutEnlargement: true
                })
                .webp({ quality: 78 })
                .toBuffer();
              await writeFile("public/photos/" + file, bytes);
            }
            const meta = await sharp(bytes).metadata();
            variants.push({
              url: "/photos/" + file,
              width: meta.width,
              height: meta.height,
              bytes: bytes.length
            });
          }
          Object.assign(record, {
            status: "OPEN_LICENSE_VARIANTS",
            originalBytes: result.body.length,
            variants
          });
        } else {
          // Unknown rights: do not republish derivatives in our own storage.
          const result = await fetchCached(photo.imageUrl, { maxAgeDays: 180 });
          const dimensions = result.body
            ? await sharp(result.body).metadata()
            : null;
          Object.assign(record, {
            status: "EXTERNAL_UNCHANGED",
            bytes: result.body?.length,
            width: dimensions?.width,
            height: dimensions?.height
          });
        }
      } catch (error) {
        Object.assign(record, { status: "NEEDS_REVIEW", error: error.message });
      }
      records.push(record);
      if (records.length % 50 === 0) {
        await writeFile(
          ".cache/hramgo/photo-variants-checkpoint.json",
          JSON.stringify(records)
        );
        console.log(`photos: ${records.length}/${photos.length}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  })
);
const licensed = Object.fromEntries(
  records.filter((r) => r.variants).map((r) => [r.sourceUrl, r.variants])
);
await writeFile(
  "src/features/temples/photo-variants.json",
  JSON.stringify(licensed, null, 2) + "\n"
);
const report = {
  checkedAt: new Date().toISOString(),
  uniquePhotos: photos.length,
  sourceThumbnails: records.filter((r) => r.status === "SOURCE_THUMBNAIL")
    .length,
  licensedVariants: records.filter((r) => r.variants).length,
  externalUnchanged: records.filter((r) => r.status === "EXTERNAL_UNCHANGED")
    .length,
  needsReview: records.filter((r) => r.status === "NEEDS_REVIEW").length,
  thumbnailBytes: records
    .filter((r) => r.status === "SOURCE_THUMBNAIL")
    .reduce((n, r) => n + r.bytes, 0),
  records
};
await writeFile(
  "data/photo-variants-report.json",
  JSON.stringify(report, null, 2) + "\n"
);
console.log(JSON.stringify({ ...report, records: undefined }));
