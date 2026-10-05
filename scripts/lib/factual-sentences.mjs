export function factualSentences(text) {
  // Russian church titles and author initials contain periods inside a sentence.
  const protectedText = text.replace(
    /(^|[^\p{L}])((?:св|свт|мч|вмч|прп|прмч|сщмч|ул|г|д|в|им|арх|стр|пер|корп|[А-ЯЁ]))\./giu,
    "$1$2\uE000"
  );
  return protectedText
    .split(/(?<=[.!?])\s+(?=[А-ЯЁ«])/)
    .map((s) => s.replace(/\uE000/g, ".").trim())
    .filter(Boolean);
}
