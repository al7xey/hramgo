import type { TempleParishServiceView } from "@/features/temples/types";

export const parishServiceLabels: Record<TempleParishServiceView["kind"], string> = {
  sundaySchool: "Воскресная школа",
  adultSchool: "Взрослая школа",
  youth: "Молодежное движение",
  social: "Социальное служение",
  refectory: "Трапезная",
  cafe: "Кафе",
  shop: "Церковная лавка",
  choir: "Хор",
  pilgrimage: "Паломничество",
  meetings: "Приходские встречи",
  other: "Другое"
};

export const filterableParishServiceKinds: TempleParishServiceView["kind"][] = [
  "sundaySchool",
  "adultSchool",
  "youth",
  "social",
  "refectory",
  "cafe",
  "choir",
  "pilgrimage",
  "meetings"
];

export function getParishServiceLabel(kind: TempleParishServiceView["kind"]) {
  return parishServiceLabels[kind];
}
