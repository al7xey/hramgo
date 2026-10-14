import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const photoDirectory = "public/photos";
const photoFiles = (await readdir(photoDirectory))
  .filter((file) => file.toLowerCase().endsWith(".webp"))
  .map((file) => path.join(photoDirectory, file));
const iconFiles = (await readdir("public"))
  .filter((file) => /^(?:apple-touch-icon|favicon-64|icon-192|icon-512)\.png$/i.test(file))
  .map((file) => path.join("public", file));

let originalBytes = 0;
let optimizedBytes = 0;
let optimizedFiles = 0;

for (const file of [...photoFiles, ...iconFiles]) {
  const original = await readFile(file);
  const originalSize = original.length;
  const result = file.toLowerCase().endsWith(".webp")
    ? await sharp(original).webp({ quality: 72, effort: 6 }).toBuffer()
    : await sharp(original)
        .png({ palette: true, quality: 100, effort: 10, dither: 0 })
        .toBuffer();

  originalBytes += originalSize;
  // Avoid repeatedly re-encoding lossy WebP files for tiny size gains.
  const next = result.length <= originalSize * 0.95 ? result : original;
  optimizedBytes += next.length;
  if (next !== original) {
    await writeFile(file, next);
    optimizedFiles += 1;
  }
}

console.log(
  `Optimized ${optimizedFiles}/${photoFiles.length + iconFiles.length} local images: ${originalBytes} → ${optimizedBytes} bytes (${originalBytes ? Math.round((1 - optimizedBytes / originalBytes) * 100) : 0}% smaller).`
);
