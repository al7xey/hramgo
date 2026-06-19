export function getPublicTempleName(temple: { name: string; shortName?: string | null; objectType?: string | null }) {
  const name = temple.name.trim();
  const shortName = temple.shortName?.trim() ?? "";
  const objectType = temple.objectType?.trim() ?? "";

  if (/подворье/iu.test(name)) {
    if (shortName && !/Патриаршее|подворье/iu.test(shortName)) {
      return shortName;
    }

    const monasteryMatch = name.match(/(?:подворье\s+)?(.+?монастыр[ья][^,]*)/iu);
    if (monasteryMatch?.[1]) {
      return monasteryMatch[1].trim();
    }

    if (/монастыр/iu.test(objectType)) {
      return objectType;
    }
  }

  return cleanPublicTempleName(name);
}

export function getPublicTempleShortName(temple: { name: string; shortName?: string | null; objectType?: string | null }) {
  const publicName = getPublicTempleName(temple);
  const shortName = temple.shortName?.trim() ?? "";

  if (!shortName || /Патриаршее\s+подворье/iu.test(shortName)) {
    return publicName;
  }

  return cleanPublicTempleName(shortName);
}

function cleanPublicTempleName(value: string) {
  return value
    .replace(/^Патриаршее\s+подворье\s+храмов\s+(.+?)(?:,.*)?$/iu, "Храмы $1")
    .replace(/^Патриаршее\s+подворье\s+(.+?)(?:,.*)?$/iu, "$1")
    .replace(/\s*,?\s*Патриаршее\s+подворье\s*$/iu, "")
    .replace(/\s*,\s*Патриаршее\s+подворье\b.*$/iu, "")
    .replace(/\s+—\s+Патриаршее\b.*подворье\b.*$/iu, "")
    .replace(/\s+—\s+Патриаршее\s+подворье\b.*$/iu, "")
    .replace(/\s+/gu, " ")
    .trim();
}
