import { describe, expect, it } from 'vitest';

import {
  dateToUnixTimestamp,
  daysInMs,
  daysInSec,
  fiveMinInMs,
  hoursInMs,
  hoursInSec,
  minutesInMs,
  minutesInSec,
  oneDayInMs,
  oneMinInMs,
  oneWeekInMs,
  secondsInMs,
  weeksInMs,
  weeksInSec,
} from './time';

describe('time constants', () => {
  it('defines one minute in milliseconds', () => {
    expect(oneMinInMs).toBe(60_000);
  });

  it('defines five minutes in milliseconds', () => {
    expect(fiveMinInMs).toBe(300_000);
  });

  it('defines one day in milliseconds', () => {
    expect(oneDayInMs).toBe(86_400_000);
  });

  it('defines one week in milliseconds', () => {
    expect(oneWeekInMs).toBe(604_800_000);
  });
});

describe(dateToUnixTimestamp.name, () => {
  it('returns zero for the unix epoch', () => {
    expect(dateToUnixTimestamp(new Date(0))).toBe(0);
  });

  it('converts a date to whole seconds', () => {
    expect(dateToUnixTimestamp(new Date('2024-01-01T00:00:00.000Z'))).toBe(1_704_067_200);
  });

  it('drops the milliseconds of a date after the epoch', () => {
    expect(dateToUnixTimestamp(new Date(1_999))).toBe(1);
  });

  it('rounds down for a date before the epoch', () => {
    expect(dateToUnixTimestamp(new Date(-1_500))).toBe(-2);
  });
});

describe('durations in milliseconds', () => {
  it.each([
    { fn: secondsInMs, oneUnit: 1_000 },
    { fn: minutesInMs, oneUnit: oneMinInMs },
    { fn: hoursInMs, oneUnit: 3_600_000 },
    { fn: daysInMs, oneUnit: oneDayInMs },
    { fn: weeksInMs, oneUnit: oneWeekInMs },
  ])('$fn.name converts zero, positive, fractional and negative durations', ({ fn, oneUnit }) => {
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(oneUnit);
    expect(fn(3)).toBe(3 * oneUnit);
    expect(fn(0.5)).toBe(oneUnit / 2);
    expect(fn(-2)).toBe(-2 * oneUnit);
  });

  it('matches the five minute constant', () => {
    expect(minutesInMs(5)).toBe(fiveMinInMs);
  });
});

describe('durations in seconds', () => {
  it.each([
    { fn: minutesInSec, oneUnit: 60 },
    { fn: hoursInSec, oneUnit: 3_600 },
    { fn: daysInSec, oneUnit: 86_400 },
    { fn: weeksInSec, oneUnit: 604_800 },
  ])('$fn.name converts zero, positive, fractional and negative durations', ({ fn, oneUnit }) => {
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(oneUnit);
    expect(fn(3)).toBe(3 * oneUnit);
    expect(fn(0.5)).toBe(oneUnit / 2);
    expect(fn(-2)).toBe(-2 * oneUnit);
  });

  it('agrees with the millisecond helpers', () => {
    expect(weeksInSec(2) * 1_000).toBe(weeksInMs(2));
  });
});
