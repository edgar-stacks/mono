import { formatRelativeTime } from './format-relative-time';

describe(formatRelativeTime.name, () => {
  const now = new Date('2026-01-01T12:00:00Z');

  test('formats a past date', () => {
    expect(formatRelativeTime(new Date('2026-01-01T11:55:00Z'), now)).toEqual('5 minutes ago');
  });

  test('formats a future date', () => {
    expect(formatRelativeTime(new Date('2026-01-01T14:00:00Z'), now)).toEqual('in 2 hours');
  });

  test('formats the same instant', () => {
    expect(formatRelativeTime(now, now)).toEqual('0 seconds ago');
  });
});
