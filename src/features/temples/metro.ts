import type { TransitLineView } from "@/features/temples/types";

export const metroLines: TransitLineView[] = [
  { id: "1", name: "Сокольническая", color: "#E42313", system: "metro" },
  { id: "2", name: "Замоскворецкая", color: "#4FB04F", system: "metro" },
  { id: "3", name: "Арбатско-Покровская", color: "#0072BA", system: "metro" },
  { id: "4", name: "Филевская", color: "#1EBCEF", system: "metro" },
  { id: "5", name: "Кольцевая", color: "#915133", system: "metro" },
  { id: "6", name: "Калужско-Рижская", color: "#F07E24", system: "metro" },
  { id: "7", name: "Таганско-Краснопресненская", color: "#943E90", system: "metro" },
  { id: "8", name: "Калининская", color: "#FFCD1C", system: "metro" },
  { id: "8A", name: "Солнцевская", color: "#FFCD1C", system: "metro" },
  { id: "9", name: "Серпуховско-Тимирязевская", color: "#ADACAC", system: "metro" },
  { id: "10", name: "Люблинско-Дмитровская", color: "#BED12C", system: "metro" },
  { id: "11", name: "Большая кольцевая", color: "#88CDCF", system: "metro" },
  { id: "12", name: "Бутовская", color: "#BAC8E8", system: "metro" },
  { id: "14", name: "МЦК", color: "#F9BCD1", system: "mcc" },
  { id: "15", name: "Некрасовская", color: "#DE64A1", system: "metro" },
  { id: "16", name: "Троицкая", color: "#8D5B2D", system: "metro" },
  { id: "D1", name: "МЦД-1 Белорусско-Савеловский", color: "#F6A800", system: "mcd" },
  { id: "D2", name: "МЦД-2 Курско-Рижский", color: "#E94282", system: "mcd" },
  { id: "D3", name: "МЦД-3 Ленинградско-Казанский", color: "#DE6F2C", system: "mcd" },
  { id: "D4", name: "МЦД-4 Калужско-Нижегородский", color: "#00A88E", system: "mcd" },
  { id: "D5", name: "МЦД-5 Ярославско-Павелецкий", color: "#8CC63E", system: "mcd" }
];

export function getMetroLine(id: string) {
  return metroLines.find((line) => line.id === id) ?? metroLines[0];
}
