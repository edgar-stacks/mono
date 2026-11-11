import { hasVisibleCharacter } from './rename-validation';

describe(hasVisibleCharacter.name, () => {
  it.each([
    ['a braille blank', '⠀'],
    ['a Hangul filler', 'ㅤ'],
    ['a zero-width joiner', '‍'],
    ['a zero-width space and a word joiner', '​⁠'],
    ['only spaces', '   '],
    ['an empty string', ''],
  ])('returns false for %s', (_, name) => {
    expect(hasVisibleCharacter(name)).toBe(false);
  });

  it.each([
    ['a family emoji joined by zero-width joiners', '👨‍👩‍👧 savings'],
    ['a plain name', 'Savings'],
    ['a name surrounded by blank-looking characters', '⠀Savingsㅤ'],
  ])('returns true for %s', (_, name) => {
    expect(hasVisibleCharacter(name)).toBe(true);
  });
});
