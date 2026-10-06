import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeViewUrl,
  readMapView
} from "../src/features/temples/view-state";
test("restoration identity does not persist precise user coordinates", () => {
  const value = normalizeViewUrl(
    "/temples/?longitude=37.6319444&latitude=55.603283&query=Покрова"
  );
  assert.ok(!value.includes("37.6319444") && !value.includes("55.603283"));
  assert.equal(
    value,
    normalizeViewUrl(
      "/temples/?query=Покрова&latitude=55.603283&longitude=37.6319444"
    )
  );
});
test("invalid saved map bounds cannot break a restored map", () => {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage"
  );
  try {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: () =>
          JSON.stringify({ key: "/map/", center: [999, 37.61], zoom: 10 })
      }
    });
    assert.equal(readMapView(""), undefined);
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
