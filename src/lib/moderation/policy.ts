const blockedPatterns = [
  /плох(ой|ая|ое)\s+храм/i,
  /худш(ий|ая|ее)\s+храм/i,
  /рейтинг\s+священник/i,
  /качество\s+(службы|священника)/i,
  /жалоб[аы]\s+на\s+батюшк/i
];

const needsReviewPatterns = [
  /конфликт/i,
  /скандал/i,
  /обвин/i,
  /оскорб/i,
  /политик/i
];

export function moderateVisitorText(text: string) {
  const blocked = blockedPatterns.find((pattern) => pattern.test(text));

  if (blocked) {
    return {
      status: "REJECTED" as const,
      reason:
        "Формулировка похожа на оценочное или конфликтное высказывание. Пожалуйста, опишите конкретную информацию для посетителей."
    };
  }

  const needsReview = needsReviewPatterns.some((pattern) => pattern.test(text));

  return {
    status: needsReview ? ("NEEDS_REVIEW" as const) : ("PENDING" as const),
    reason: needsReview
      ? "Текст требует ручной проверки модератором."
      : "Отзыв отправлен на модерацию."
  };
}
