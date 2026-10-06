import assert from "node:assert/strict";
import test from "node:test";
import { analyticsPageUrl } from "../src/lib/analytics";

test("analytics excludes coordinates, search, payment identifiers and fragments", () => {
  assert.equal(
    analyticsPageUrl("https://hramgo.ru/map/?lat=55.123&lon=37.456#private"),
    "https://hramgo.ru/map/"
  );
  assert.equal(
    analyticsPageUrl("/support/?requestId=private&email=test@example.com"),
    "https://hramgo.ru/support/"
  );
  assert.equal(
    analyticsPageUrl("/temples/?query=private"),
    "https://hramgo.ru/temples/"
  );
});
test("analytics keeps temple paths but strips untrusted referrer paths", () => {
  assert.equal(
    analyticsPageUrl("/temples/pokrova-na-gorodne/"),
    "https://hramgo.ru/temples/pokrova-na-gorodne/"
  );
  assert.equal(
    analyticsPageUrl("https://example.org/private?email=secret"),
    "https://example.org/"
  );
  assert.equal(analyticsPageUrl("/someone@example.com"), "https://hramgo.ru/");
});
