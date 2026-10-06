import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { sitemapUrls, pendingUrls } from "./lib/indexnow.mjs";

const cache = ".cache/hramgo/indexnow";
const stateFile = `${cache}/state.json`;
const sitemap = await readFile("out/sitemap.xml", "utf8");
const urls = sitemapUrls(sitemap);
const state = await readFile(stateFile, "utf8")
  .then(JSON.parse)
  .catch((error) => {
    if (error.code === "ENOENT") return {};
    throw error;
  });
const records = await Promise.all(
  urls.map(async (url) => {
    const file = path.resolve(
      "out",
      `.${decodeURIComponent(new URL(url).pathname)}`,
      "index.html"
    );
    if (!file.startsWith(path.resolve("out") + path.sep))
      throw new Error("Unsafe export path");
    return {
      url,
      hash: createHash("sha256")
        .update(await readFile(file))
        .digest("hex")
    };
  })
);
const pending = pendingUrls(records, state);
console.log(
  `Sitemap: ${urls.length}; new or changed since last notification: ${pending.length}.`
);
if (!process.argv.includes("--submit") || !pending.length) process.exit(0);

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(30000)
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
      continue;
    }
    return response;
  }
}

const published = await request("https://hramgo.ru/sitemap.xml");
if (!published.ok || (await published.text()) !== sitemap)
  throw new Error("Publish this export before notifying search engines.");
const key = (await readFile(`${cache}/key.txt`, "utf8")).trim();
if (!/^[A-Za-z0-9-]{8,128}$/.test(key))
  throw new Error("Invalid local IndexNow key");
const keyLocation = `https://hramgo.ru/${key}.txt`;
const proof = await request(keyLocation);
if (!proof.ok || (await proof.text()).trim() !== key)
  throw new Error("IndexNow proof is not published.");
await mkdir(cache, { recursive: true });
for (let offset = 0; offset < pending.length; offset += 10000) {
  const batch = pending.slice(offset, offset + 10000);
  const response = await request("https://yandex.com/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "hramgo.ru",
      key,
      keyLocation,
      urlList: batch.map((record) => record.url)
    })
  });
  if (![200, 202].includes(response.status))
    throw new Error(`Yandex IndexNow returned HTTP ${response.status}.`);
  for (const record of batch)
    state[record.url] = {
      hash: record.hash,
      submittedAt: new Date().toISOString(),
      httpStatus: response.status
    };
  await writeFile(`${stateFile}.tmp`, JSON.stringify(state, null, 2));
  await rename(`${stateFile}.tmp`, stateFile);
  console.log(
    `Yandex: HTTP ${response.status}; ${batch.length} URLs ${response.status === 202 ? "received; key verification pending" : "received"}. Index inclusion is not guaranteed.`
  );
}
