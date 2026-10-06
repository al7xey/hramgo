import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error JavaScript notification helper
import { sitemapUrls, pendingUrls } from "../scripts/lib/indexnow.mjs";

test("index notifications use canonical paths and exclude private query parameters", () => {
  assert.deepEqual(
    sitemapUrls(
      "<urlset><url><loc>https://hramgo.ru/temples/test</loc></url><url><loc>https://hramgo.ru/temples/test/</loc></url></urlset>"
    ),
    ["https://hramgo.ru/temples/test/"]
  );
  for (const url of [
    "https://example.org/",
    "https://hramgo.ru/support/?payment=private",
    "https://hramgo.ru/map/?latitude=55.1",
    "https://hramgo.ru/#private"
  ]) {
    assert.throws(() =>
      sitemapUrls(`<urlset><url><loc>${url}</loc></url></urlset>`)
    );
  }
});
test("unchanged notifications are skipped and changed pages remain eligible", () => {
  assert.deepEqual(
    pendingUrls(
      [
        { url: "a", hash: "1" },
        { url: "b", hash: "2" }
      ],
      { a: { hash: "1" }, b: { hash: "old" } }
    ),
    [{ url: "b", hash: "2" }]
  );
});
