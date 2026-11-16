const invisibleSeparatorsRegex = /[\u0085\u200B\u2060\uFEFF]/g;

export function extractPhraseFromString(value: string) {
  const clean = value.replace(invisibleSeparatorsRegex, ' ').trim();
  const words = clean.match(/\S+/g);
  if (words?.length) {
    return words
      .map(word => (word.match(/[^0-9]+/g) ? word : null))
      .filter(Boolean)
      .join(' ');
  } else {
    return clean;
  }
}
