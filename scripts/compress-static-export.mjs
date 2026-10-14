import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompress, constants } from "node:zlib";
import { promisify } from "node:util";

const compress = promisify(brotliCompress);
const root = path.resolve("out");
const textExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".svg",
  ".webmanifest",
  ".xml"
]);

async function* filesIn(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* filesIn(file);
    else if (entry.isFile()) yield file;
  }
}

const candidates = [];
for await (const file of filesIn(root)) {
  if (file.endsWith(".br")) {
    await unlink(file);
    continue;
  }
  if (!textExtensions.has(path.extname(file)) || file.endsWith(".br")) continue;
  const metadata = await stat(file);
  if (metadata.size >= 1024) candidates.push(file);
}

let sourceBytes = 0;
let compressedBytes = 0;
let files = 0;
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < candidates.length) {
      const file = candidates[cursor++];
      const source = await readFile(file);
      const brotli = await compress(source, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 4,
          [constants.BROTLI_PARAM_SIZE_HINT]: source.length
        }
      });
      if (brotli.length >= source.length) continue;

      await writeFile(`${file}.br`, brotli);
      sourceBytes += source.length;
      compressedBytes += brotli.length;
      files += 1;
    }
  })
);

console.log(
  `Prepared ${files} Brotli sidecars from ${candidates.length} static application assets: ${sourceBytes} → ${compressedBytes} bytes (${sourceBytes ? Math.round((1 - compressedBytes / sourceBytes) * 100) : 0}% smaller).`
);
