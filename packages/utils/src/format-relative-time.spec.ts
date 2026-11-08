import { formatRelativeTime } from './format-relative-time';
import { hoursInMs, minutesInMs } from './time';

const now = new Date('2026-01-01T12:00:00.000Z');

describe(formatRelativeTime.name, () => {
  test('formats a past date', () => {
    const date = new Date(now.getTime() - minutesInMs(5));
    expect(formatRelativeTime(date, now)).toEqual('5 minutes ago');
  });

  test('formats a future date', () => {
    const date = new Date(now.getTime() + hoursInMs(2));
    expect(formatRelativeTime(date, now)).toEqual('in 2 hours');
  });

  test('formats the same instant', () => {
    expect(formatRelativeTime(now, now)).toEqual('0 seconds ago');
  });
});
