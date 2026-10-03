import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import { lookup } from "node:dns/promises";
import robotsParser from "robots-parser";
const ROOT = ".cache/hramgo/http";
const USER_AGENT = "HramGoBot/1.0 (+https://hramgo.ru)";
const robots = new Map(),
  requests = new Map();
const checkedHosts = new Map();
const privateAddress = (ip) =>
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::|f[cd]|fe[89ab])/i.test(
    ip
  );
async function safeFetch(url, init, bypassRobots) {
  for (let hop = 0; hop < 6; hop++) {
    const next = publicUrl(url);
    if (!next) throw new Error("INVALID_SOURCE_REDIRECT");
    const host = new URL(next).hostname;
    if (!checkedHosts.has(host))
      checkedHosts.set(
        host,
        lookup(host, { all: true }).then(
          (rows) =>
            rows.length > 0 && rows.every((r) => !privateAddress(r.address))
        )
      );
    if (!(await checkedHosts.get(host)))
      throw new Error("PRIVATE_SOURCE_ADDRESS");
    if (hop && !bypassRobots && !(await allowed(next)))
      throw new Error("ROBOTS_DISALLOWED");
    const response = await fetch(next, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("INVALID_SOURCE_REDIRECT");
    await response.body?.cancel();
    url = publicUrl(location, next);
  }
  throw new Error("TOO_MANY_SOURCE_REDIRECTS");
}
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export function publicUrl(value, base) {
  try {
    const u = new URL(value, base);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(
        u.hostname
      )
    )
      return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}
async function retrieve(url, { maxAgeDays = 7, bypassRobots = false } = {}) {
  url = publicUrl(url);
  if (!url) throw new Error("INVALID_SOURCE_URL");
  await mkdir(ROOT, { recursive: true });
  const id = digest(url),
    metaFile = ROOT + "/" + id + ".json",
    bodyFile = ROOT + "/" + id + ".bin";
  let old;
  try {
    old = JSON.parse(await readFile(metaFile, "utf8"));
  } catch {
    /* new URL */
  }
  if (
    old &&
    Date.now() - Date.parse(old.last_checked_at) <
      (old.http_status >= 400 || old.http_status === 0 ? 1 : maxAgeDays) *
        86400000
  ) {
    return {
      ...old,
      body: old.content_hash ? await readFile(bodyFile) : null,
      cached: true
    };
  }
  if (!bypassRobots && !(await allowed(url))) {
    return {
      source_url: url,
      http_status: 0,
      last_checked_at: new Date().toISOString(),
      robots_allowed: false,
      error: "ROBOTS_DISALLOWED",
      body: null
    };
  }
  const headers = {
    "user-agent": USER_AGENT,
    accept: "text/html,application/pdf,image/*;q=0.7,*/*;q=0.5"
  };
  if (old?.etag) headers["if-none-match"] = old.etag;
  if (old?.last_modified) headers["if-modified-since"] = old.last_modified;
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await safeFetch(
        url,
        {
          headers,
          signal: AbortSignal.timeout(12000)
        },
        bypassRobots
      );
      const checked = new Date().toISOString();
      if (response.status === 304 && old) {
        result = { ...old, last_checked_at: checked, http_status: 304 };
        break;
      }
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      result = {
        source_url: url,
        final_url: response.url,
        http_status: response.status,
        last_checked_at: checked,
        last_changed_at: old?.last_changed_at ?? checked,
        etag: response.headers.get("etag"),
        last_modified: response.headers.get("last-modified"),
        content_type: response.headers.get("content-type"),
        robots_allowed: true
      };
      if (!response.ok) {
        result.error = "HTTP_" + response.status;
        break;
      }
      if (Number(response.headers.get("content-length")) > 8 * 1024 * 1024)
        throw new Error("SOURCE_TOO_LARGE");
      const reader = response.body.getReader(),
        chunks = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8 * 1024 * 1024) {
          await reader.cancel();
          throw new Error("SOURCE_TOO_LARGE");
        }
        chunks.push(value);
      }
      const body = Buffer.concat(chunks),
        hash = digest(body);
      result.content_hash = hash;
      result.bytes = body.length;
      if (old?.content_hash === hash)
        result.last_changed_at = old.last_changed_at;
      await writeFile(bodyFile, body);
      break;
    } catch (error) {
      if (attempt < 2 && /timeout|aborted|fetch failed/i.test(error.message)) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      result = {
        source_url: url,
        last_checked_at: new Date().toISOString(),
        http_status: 0,
        robots_allowed: true,
        error: error.message.slice(0, 120)
      };
      break;
    }
  }
  await writeFile(metaFile, JSON.stringify(result));
  return {
    ...result,
    body: result.content_hash ? await readFile(bodyFile) : null,
    cached: false
  };
}
async function allowed(url) {
  const origin = new URL(url).origin;
  if (!robots.has(origin))
    robots.set(
      origin,
      (async () => {
        const res = await retrieve(origin + "/robots.txt", {
          maxAgeDays: 30,
          bypassRobots: true
        });
        if (res.http_status === 404) return null;
        if (!res.body) return false;
        return robotsParser(origin + "/robots.txt", res.body.toString("utf8"));
      })()
    );
  const rules = await robots.get(origin);
  return (
    rules === null ||
    (rules !== false && rules.isAllowed(url, USER_AGENT) !== false)
  );
}
export async function fetchCached(url, options) {
  const key = publicUrl(url);
  if (!key) throw new Error("INVALID_SOURCE_URL");
  if (!requests.has(key)) requests.set(key, retrieve(key, options));
  return requests.get(key);
}
export function decodeBody(source) {
  const charset =
    source.content_type?.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(charset).decode(source.body);
  } catch {
    return source.body.toString("utf8");
  }
}
