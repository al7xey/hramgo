const badPhotoPatterns = [
  /(^|[-_/])qr(code)?([-_.]|$)/iu,
  /(^|[-_/])(logo|icon|ico|sprite|captcha|counter|banner|baner|poster|afisha|promo|reklama)([-_.]|$)/iu,
  /(^|[-_/])(raspis|schedule|calendar|kalendar|docs?|scan|blank|rekvizit|receipt|oferta)([-_.]|$)/iu,
  /(^|[-_/])(avatar|person|face|portrait|portret|priest|duhoven|klir|svyash|nastoyatel)([-_.]|$)/iu,
  /(^|[-_/])(ornament|pattern|uzor|plitka|ikonostas|ikona|obraz)([-_.]|$)/iu,
  /(donbass|novoross|gumanitarn|pomosh|dobrovol|soyuz|molodezh|sestrichestvo|palomnich|whatsapp|telegram|vk\.com)/iu,
  /(донбасс|новоросс|гуманитар|помощ|добровол|волонтер|волонтёр|союз|молод[её]ж|сестричеств|паломнич|расписан|афиш|плакат|баннер|qr|икон|образ|духовен|клирик|настоятель|священ)/iu
];

const badSourcePatterns =
  /raspis|schedule|calendar|kalendar|rekvizit|kontakty|duhoven|klir|molodezh|vstrechi|shkola|social|prihod|novosti|news|post|page\/\d|vk\.com|t\.me|telegram|whatsapp/iu;

const templePhotoHints = /hram|church|cerkov|sobor|monast|monastery|temple| часовн|часовн|храм|церк|собор|монаст|подвор|фасад|территор|архитект|здание|колокол|купола|вид/iu;

export function isLikelyTemplePhoto(input: { imageUrl?: string | null; alt?: string | null; sourceUrl?: string | null }) {
  const imageUrl = input.imageUrl ?? "";
  const alt = input.alt ?? "";
  const sourceUrl = input.sourceUrl ?? "";
  const imageText = safeDecode(`${imageUrl} ${alt}`).toLowerCase();
  const sourceText = safeDecode(sourceUrl).toLowerCase();

  if (!imageUrl) return false;
  if (badPhotoPatterns.some((pattern) => pattern.test(imageText))) return false;
  if (badSourcePatterns.test(sourceText) && !/(gallery|galere|photo|foto|istori|history|o-hrame|about|храм|церк|собор|монаст)/iu.test(sourceText)) {
    return false;
  }
  if (/upload|uploads|media|images|photo|foto|gallery|galere|thumb/iu.test(imageUrl) && !templePhotoHints.test(imageText) && badSourcePatterns.test(sourceText)) {
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
