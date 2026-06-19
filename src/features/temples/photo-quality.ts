const badPhotoPatterns = [
  /(^|[-_/])qr(code)?([-_.]|$)/iu,
  /(^|[-_/])(logo|icon|ico|sprite|captcha|counter|banner|baner|poster|afisha)([-_.]|$)/iu,
  /(^|[-_/])(raspis|schedule|calendar|kalendar|docs?|scan|blank|rekvizit)([-_.]|$)/iu,
  /(^|[-_/])(avatar|person|face|portrait|portret|priest|duhoven|klir|svyash|nastoyatel)([-_.]|$)/iu,
  /(^|[-_/])(ornament|pattern|uzor|plitka|ikonostas|ikona|obraz)([-_.]|$)/iu
];

const badSourcePatterns =
  /raspis|schedule|calendar|kalendar|rekvizit|kontakty|duhoven|klir|molodezh|vstrechi|shkola|social|prihod|novosti|news|post|page\/\d/iu;

export function isLikelyTemplePhoto(input: { imageUrl?: string | null; alt?: string | null; sourceUrl?: string | null }) {
  const imageUrl = input.imageUrl ?? "";
  const alt = input.alt ?? "";
  const sourceUrl = input.sourceUrl ?? "";
  const imageText = safeDecode(`${imageUrl} ${alt}`).toLowerCase();
  const sourceText = safeDecode(sourceUrl).toLowerCase();

  if (!imageUrl) return false;
  if (badPhotoPatterns.some((pattern) => pattern.test(imageText))) return false;
  if (badSourcePatterns.test(sourceText) && !/(gallery|galere|photo|foto|istori|history|o-hrame|about)/iu.test(sourceText)) {
    return false;
  }

  return true;
}

export function filterTemplePhotos<T extends { imageUrl?: string | null; alt?: string | null; sourceUrl?: string | null; isMain?: boolean }>(
  photos: T[]
) {
  const good = photos.filter((photo) => isLikelyTemplePhoto(photo));
  if (good.length === 0) return [];
  return good.sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)));
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
