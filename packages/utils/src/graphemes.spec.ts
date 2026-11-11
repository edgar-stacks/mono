import { afterEach, describe, expect, test, vi } from 'vitest';

import { graphemes, sliceGraphemes, visibleLength } from './graphemes';

const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}';
const flag = '🇺🇸';
const thumbsUpWithSkinTone = '👍🏽';
const combiningE = 'e\u0301';
const hebrew = 'שלום';
const arabic = 'مرحبا';

describe('graphemes', () => {
  test('keeps ZWJ emoji sequences together', () => {
    expect(graphemes(`a${family}b`)).toEqual(['a', family, 'b']);
  });

  test('keeps flags and skin tone modifiers together', () => {
    expect(graphemes(`${flag}${thumbsUpWithSkinTone}`)).toEqual([flag, thumbsUpWithSkinTone]);
  });

  test('keeps combining marks with their base character', () => {
    expect(graphemes(`caf${combiningE}`)).toEqual(['c', 'a', 'f', combiningE]);
  });

  test('splits right-to-left text into its characters', () => {
    expect(graphemes(hebrew)).toEqual(['ש', 'ל', 'ו', 'ם']);
  });

  test('returns an empty array for an empty string', () => {
    expect(graphemes('')).toEqual([]);
  });
});

describe('sliceGraphemes', () => {
  test('never splits a ZWJ emoji sequence', () => {
    expect(sliceGraphemes(`${family}abc`, 0, 1)).toBe(family);
    expect(sliceGraphemes(`ab${family}`, 1)).toBe(`b${family}`);
  });

  test('never splits a combining mark from its base character', () => {
    expect(sliceGraphemes(`caf${combiningE}s`, 3, 4)).toBe(combiningE);
  });

  test('supports negative indexes', () => {
    expect(sliceGraphemes(`abc${flag}`, -2)).toBe(`c${flag}`);
  });

  test('slices right-to-left text', () => {
    expect(sliceGraphemes(arabic, 0, 2)).toBe('مر');
  });
});

describe('visibleLength', () => {
  test('counts a ZWJ family emoji as one', () => {
    expect(visibleLength(family)).toBe(1);
  });

  test('counts combining marks with their base character', () => {
    expect(visibleLength(`caf${combiningE}`)).toBe(4);
  });

  test('counts right-to-left text', () => {
    expect(visibleLength(arabic)).toBe(5);
  });

  test('does not count invisible characters', () => {
    expect(visibleLength('a\u200Bb\u2060c')).toBe(3);
    expect(visibleLength(`\u202E${hebrew}\u202C`)).toBe(4);
    expect(visibleLength('\u2066abc\u2069\u200E\u200F\uFEFF')).toBe(3);
  });

  test('returns 0 for a string of only invisible characters', () => {
    expect(visibleLength('\u200B\u2060\u200E')).toBe(0);
  });
});

describe('without Intl.Segmenter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubOutSegmenter() {
    vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined });
  }

  test('falls back to code points', () => {
    stubOutSegmenter();
    expect(graphemes(`a${flag}`)).toEqual(['a', '🇺', '🇸']);
  });

  test('never splits a surrogate pair', () => {
    stubOutSegmenter();
    expect(sliceGraphemes('😀😁', 0, 1)).toBe('😀');
  });

  test('does not count invisible characters', () => {
    stubOutSegmenter();
    expect(visibleLength('a\u200Bb\u2060c\u202E')).toBe(3);
    expect(visibleLength(family)).toBe(3);
  });
});
