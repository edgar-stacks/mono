import { describe, expect, test } from 'vitest';

import { isVersionGreaterThan } from './version.js';

describe(isVersionGreaterThan.name, () => {
  test('ignores a leading v', () => {
    expect(isVersionGreaterThan('v6.116.0', '6.115.0')).toBe(true);
    expect(isVersionGreaterThan('6.116.0', 'v6.115.0')).toBe(true);
  });

  test('compares only the numeric part before a pre-release tag', () => {
    expect(isVersionGreaterThan('6.116.0-beta.1', '6.115.0')).toBe(true);
    expect(isVersionGreaterThan('6.115.0-beta.1', '6.115.0')).toBe(false);
  });

  test('returns false for equal or lower versions', () => {
    expect(isVersionGreaterThan('6.115.0', '6.115.0')).toBe(false);
    expect(isVersionGreaterThan('6.114.9', '6.115.0')).toBe(false);
  });

  test('throws on a part that is not a number', () => {
    expect(() => isVersionGreaterThan('six.1.0', '6.115.0')).toThrow();
    expect(() => isVersionGreaterThan('6.115.0', '6..0')).toThrow();
  });
});
