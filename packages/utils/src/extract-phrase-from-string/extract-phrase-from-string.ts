const invisibleSeparators = /[\u0085\u200B\u2060\uFEFF]/g;
const listMarker = /^(\d+[.):]|#\d+|[-*])$/;

function isListMarker(word: string) {
  return listMarker.test(word);
}

export function extractPhraseFromString(value: string) {
  const clean = value.replace(invisibleSeparators, ' ').trim();
  const words = clean.match(/\S+/g);
  if (words?.length) {
    return words
      .filter(word => word.match(/[^0-9]+/g))
      .filter(word => !isListMarker(word))
      .join(' ');
  } else {
    return clean;
  }
}
