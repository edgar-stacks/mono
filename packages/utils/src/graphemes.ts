const invisibleCharactersRegex =
  /^[\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]+$/;

export function graphemes(text: string) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return Array.from(text);
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

export function sliceGraphemes(text: string, start?: number, end?: number) {
  return graphemes(text).slice(start, end).join('');
}

export function visibleLength(text: string) {
  return graphemes(text).filter(grapheme => !invisibleCharactersRegex.test(grapheme)).length;
}
