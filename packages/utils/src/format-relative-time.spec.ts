import { formatRelativeTime } from './format-relative-time';
import { hoursInMs, minutesInMs } from './time';

describe(formatRelativeTime.name, () => {
  const now = new Date('2026-01-01T12:00:00Z');

  test('formats a date in the past', () => {
    const date = new Date(now.getTime() - minutesInMs(5));
    expect(formatRelativeTime(date, now)).toEqual('5 minutes ago');
  });

  test('formats a date in the future', () => {
    const date = new Date(now.getTime() + hoursInMs(2));
    expect(formatRelativeTime(date, now)).toEqual('in 2 hours');
  });
});
