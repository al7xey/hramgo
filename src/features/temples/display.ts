export function getPublicTempleName(temple: { name: string; shortName?: string | null; objectType?: string | null }) {
  const name = temple.name.trim();
  const shortName = temple.shortName?.trim() ?? "";
  const objectType = temple.objectType?.trim() ?? "";

  if (/подворье/iu.test(name)) {
    if (shortName && !/Патриаршее|подворье/iu.test(shortName)) {
      return cleanPublicTempleName(shortName, name);
    }

    const monasteryMatch = name.match(/(?:подворье\s+)?(.+?монастыр[ья][^,]*)/iu);
    if (monasteryMatch?.[1]) {
      return cleanPublicTempleName(monasteryMatch[1].trim(), name);
    }

    if (/монастыр/iu.test(objectType)) {
      return objectType;
    }
  }

  return cleanPublicTempleName(name, name);
}

export function getPublicTempleShortName(temple: { name: string; shortName?: string | null; objectType?: string | null }) {
  const publicName = getPublicTempleName(temple);
  const shortName = temple.shortName?.trim() ?? "";

  if (!shortName || /Патриаршее\s+подворье/iu.test(shortName)) {
    return publicName;
  }

  return cleanPublicTempleName(shortName, temple.name);
}

function cleanPublicTempleName(value: string, originalValue = value) {
  const knownMonasteryName = getKnownMonasteryName(value);

  if (knownMonasteryName) {
    return knownMonasteryName;
  }

  const cleaned = value
    .replace(/^Патриаршее\s+подворье\s+храмов\s+(.+?)(?:,.*)?$/iu, "Храмы $1")
    .replace(/^Патриаршее\s+подворье\s+храма\s+(.+?)(?:,.*)?$/iu, "Храм $1")
    .replace(/^Патриаршее\s+подворье\s+(.+?)(?:,.*)?$/iu, "$1")
    .replace(/\s*,?\s*Патриаршее\s+подворье\s*$/iu, "")
    .replace(/\s*,\s*Патриаршее\s+подворье\b.*$/iu, "")
    .replace(/\s+—\s+Патриаршее\b.*подворье\b.*$/iu, "")
    .replace(/\s+—\s+Патриаршее\s+подворье\b.*$/iu, "")
    .replace(/\s+/gu, " ")
    .trim();

  if (/^Храм\b/iu.test(originalValue) && cleaned && !/^(Храм|Церковь|Собор|Часовня|Монастырь|Храмы)\b/iu.test(cleaned)) {
    return `Храм ${cleaned}`;
  }

  return cleaned;
}

function getKnownMonasteryName(value: string) {
  const normalized = value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");

  if (/андроник/.test(normalized)) {
    return "Спасо-Андроников монастырь";
  }

  if (/николо[-\s]перервин/.test(normalized)) {
    return "Николо-Перервинский монастырь";
  }

  if (/сретен/.test(normalized) && /монастыр/.test(normalized)) {
    return "Сретенский ставропигиальный мужской монастырь";
  }

  if (/новоспас/.test(normalized)) {
    return "Новоспасский ставропигиальный мужской монастырь";
  }

  if (/высоко[-\s]петров/.test(normalized)) {
    return "Высоко-Петровский мужской монастырь";
  }

  if (/донск/.test(normalized) && /монастыр/.test(normalized)) {
    return "Донской ставропигиальный мужской монастырь";
  }

  if (/данилов/.test(normalized) && /монастыр/.test(normalized)) {
    return "Свято-Данилов мужской монастырь";
  }

  if (/новодевич/.test(normalized)) {
    return "Новодевичий ставропигиальный женский монастырь";
  }

  if (/зачатьев/.test(normalized)) {
    return "Зачатьевский ставропигиальный женский монастырь";
  }

  if (/покровск/.test(normalized) && /монастыр/.test(normalized)) {
    return "Покровский ставропигиальный женский монастырь";
  }

  if (/андреевск/.test(normalized) && /монастыр/.test(normalized)) {
    return "Андреевский ставропигиальный мужской монастырь";
  }

  return null;
}
