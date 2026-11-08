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
  it('defines durations in milliseconds', () => {
    expect(oneMinInMs).toEqual(60_000);
    expect(fiveMinInMs).toEqual(300_000);
    expect(oneDayInMs).toEqual(86_400_000);
    expect(oneWeekInMs).toEqual(604_800_000);
  });
});

describe(dateToUnixTimestamp.name, () => {
  it('converts a date to whole seconds since the epoch', () => {
    expect(dateToUnixTimestamp(new Date('2024-01-01T00:00:00.000Z'))).toEqual(1_704_067_200);
  });

  it('drops the milliseconds', () => {
    expect(dateToUnixTimestamp(new Date('2024-01-01T00:00:00.999Z'))).toEqual(1_704_067_200);
  });

  it('returns zero for the epoch', () => {
    expect(dateToUnixTimestamp(new Date(0))).toEqual(0);
  });

  it('rounds down for dates before the epoch', () => {
    expect(dateToUnixTimestamp(new Date(-1_000))).toEqual(-1);
    expect(dateToUnixTimestamp(new Date(-1_500))).toEqual(-2);
  });
});

describe('durations in milliseconds', () => {
  it.each([
    { fn: secondsInMs, value: 1, expected: 1_000 },
    { fn: minutesInMs, value: 1, expected: oneMinInMs },
    { fn: minutesInMs, value: 5, expected: fiveMinInMs },
    { fn: hoursInMs, value: 1, expected: 3_600_000 },
    { fn: daysInMs, value: 1, expected: oneDayInMs },
    { fn: weeksInMs, value: 1, expected: oneWeekInMs },
    { fn: secondsInMs, value: 1.5, expected: 1_500 },
    { fn: weeksInMs, value: 2, expected: 2 * oneWeekInMs },
  ])('$fn.name($value) returns $expected', ({ fn, value, expected }) => {
    expect(fn(value)).toEqual(expected);
  });

  it.each([secondsInMs, minutesInMs, hoursInMs, daysInMs, weeksInMs])(
    '%o returns zero for zero',
    fn => {
      expect(fn(0)).toEqual(0);
    }
  );

  it.each([
    { fn: secondsInMs, expected: -1_000 },
    { fn: minutesInMs, expected: -oneMinInMs },
    { fn: hoursInMs, expected: -3_600_000 },
    { fn: daysInMs, expected: -oneDayInMs },
    { fn: weeksInMs, expected: -oneWeekInMs },
  ])('$fn.name(-1) returns $expected', ({ fn, expected }) => {
    expect(fn(-1)).toEqual(expected);
  });
});

describe('durations in seconds', () => {
  it.each([
    { fn: minutesInSec, value: 1, expected: 60 },
    { fn: hoursInSec, value: 1, expected: 3_600 },
    { fn: daysInSec, value: 1, expected: 86_400 },
    { fn: weeksInSec, value: 1, expected: 604_800 },
    { fn: minutesInSec, value: 0.5, expected: 30 },
    { fn: weeksInSec, value: 2, expected: 1_209_600 },
  ])('$fn.name($value) returns $expected', ({ fn, value, expected }) => {
    expect(fn(value)).toEqual(expected);
  });

  it.each([minutesInSec, hoursInSec, daysInSec, weeksInSec])('%o returns zero for zero', fn => {
    expect(fn(0)).toEqual(0);
  });

  it.each([
    { fn: minutesInSec, expected: -60 },
    { fn: hoursInSec, expected: -3_600 },
    { fn: daysInSec, expected: -86_400 },
    { fn: weeksInSec, expected: -604_800 },
  ])('$fn.name(-1) returns $expected', ({ fn, expected }) => {
    expect(fn(-1)).toEqual(expected);
  });
});
