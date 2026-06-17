export const templeExtractionPrompt = `
Верни только валидный JSON без Markdown.
Не придумывай данные. Если поле не найдено в источнике, верни null или unknown.
Не делай вывод "нет воскресной школы", если она просто не найдена.
Для каждого заполненного поля добавь evidence: field, value, sourceUrl, quote, confidence.
Сохраняй короткую цитату из источника, подтверждающую значение.
Фотографии не добавляй в approved: если права не очевидны, ставь copyrightStatus manual_review.
Схема ответа:
{
  "name": "string",
  "description": "string|null",
  "address": "string|null",
  "phone": "string|null",
  "email": "string|null",
  "websiteUrl": "string|null",
  "rectorName": "string|null",
  "vicariate": "string|null",
  "deanery": "string|null",
  "objectType": "string|null",
  "scheduleSummary": "string|null",
  "sundaySchoolStatus": "yes|no|unknown",
  "sundaySchoolDescription": "string|null",
  "evidence": [],
  "photos": []
}
`;
