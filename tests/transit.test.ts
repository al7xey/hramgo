import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error The crawler shares this dependency-free JavaScript module.
import { nearestStations, distanceMeters } from "../scripts/lib/transit.mjs";

const evidence = JSON.parse(
  readFileSync("scripts/data/mcd-coordinates.json", "utf8")
);
const stations = evidence.stations.map((s: { name: string }) => ({
  ...s,
  station: s.name
}));
test("Pokrovskoye D2 is beside Gorodnya, rather than in north-west Moscow", () => {
  const temple = { latitude: 55.603283, longitude: 37.627867 };
  const result = nearestStations(temple, stations);
  assert.equal(result[0].station, "Покровское");
  assert.equal(result[0].line, "D2");
  assert.ok(result[0].distance_meters < 300);
});
test("rail platforms do not inherit coordinates of similarly named metro stations", () => {
  const station = stations.find(
    (s: { station: string; line: string }) =>
      s.station === "Волоколамская" && s.line === "D2"
  );
  assert.ok(
    distanceMeters(station, { latitude: 55.835154, longitude: 37.382453 }) > 200
  );
  assert.ok(
    !stations.some(
      (s: { station: string; line: string }) =>
        s.station === "Покровское-Стрешнево" && s.line === "D2"
    )
  );
  assert.ok(
    !stations.some(
      (s: { station: string; line: string }) =>
        s.station === "Рижская" && s.line === "D4"
    )
  );
});
test("nearest station dedupe retains the closest platform and has no modal quota", () => {
  const t = { latitude: 55.75, longitude: 37.61 };
  const result = nearestStations(t, [
    {
      station: "Пересадочная",
      latitude: 55.751,
      longitude: 37.61,
      system: "mcd"
    },
    {
      station: "Пересадочная",
      latitude: 55.78,
      longitude: 37.61,
      system: "metro"
    },
    { station: "Следующая", latitude: 55.752, longitude: 37.61, system: "mcd" },
    { station: "Метро", latitude: 55.76, longitude: 37.61, system: "metro" },
    { station: "Далеко", latitude: 56, longitude: 37.61, system: "metro" }
  ]);
  assert.deepEqual(
    result.map((s: { station: string }) => s.station),
    ["Пересадочная", "Следующая", "Метро"]
  );
  assert.equal(result[0].system, "mcd");
  assert.equal(
    nearestStations({ latitude: 55, longitude: 37 }, stations).length,
    0
  );
});
