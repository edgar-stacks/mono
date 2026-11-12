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
  test('oneMinInMs is sixty thousand milliseconds', () => {
    expect(oneMinInMs).toEqual(60_000);
  });

  test('fiveMinInMs is five minutes in milliseconds', () => {
    expect(fiveMinInMs).toEqual(300_000);
  });

  test('oneDayInMs is one day in milliseconds', () => {
    expect(oneDayInMs).toEqual(86_400_000);
  });

  test('oneWeekInMs is seven days in milliseconds', () => {
    expect(oneWeekInMs).toEqual(604_800_000);
  });
});

describe(dateToUnixTimestamp.name, () => {
  test('returns 0 for the unix epoch', () => {
    expect(dateToUnixTimestamp(new Date(0))).toEqual(0);
  });

  test('converts a date to whole seconds', () => {
    expect(dateToUnixTimestamp(new Date('2024-01-01T00:00:00.000Z'))).toEqual(1704067200);
  });

  test('floors leftover milliseconds', () => {
    expect(dateToUnixTimestamp(new Date(1999))).toEqual(1);
  });

  test('floors a negative millisecond value to -1', () => {
    expect(dateToUnixTimestamp(new Date(-1))).toEqual(-1);
  });
});

describe(weeksInMs.name, () => {
  test('converts weeks to milliseconds', () => {
    expect(weeksInMs(1)).toEqual(oneWeekInMs);
    expect(weeksInMs(2)).toEqual(1_209_600_000);
  });

  test('returns 0 for 0 weeks', () => {
    expect(weeksInMs(0)).toEqual(0);
  });

  test('returns a negative value for negative weeks', () => {
    expect(weeksInMs(-1)).toEqual(-604_800_000);
  });

  test('handles fractional weeks', () => {
    expect(weeksInMs(0.5)).toEqual(302_400_000);
  });
});

describe(daysInMs.name, () => {
  test('converts days to milliseconds', () => {
    expect(daysInMs(1)).toEqual(oneDayInMs);
    expect(daysInMs(3)).toEqual(259_200_000);
  });

  test('returns 0 for 0 days', () => {
    expect(daysInMs(0)).toEqual(0);
  });

  test('returns a negative value for negative days', () => {
    expect(daysInMs(-1)).toEqual(-86_400_000);
  });

  test('handles fractional days', () => {
    expect(daysInMs(0.5)).toEqual(43_200_000);
  });
});

describe(hoursInMs.name, () => {
  test('converts hours to milliseconds', () => {
    expect(hoursInMs(1)).toEqual(3_600_000);
    expect(hoursInMs(24)).toEqual(oneDayInMs);
  });

  test('returns 0 for 0 hours', () => {
    expect(hoursInMs(0)).toEqual(0);
  });

  test('returns a negative value for negative hours', () => {
    expect(hoursInMs(-2)).toEqual(-7_200_000);
  });

  test('handles fractional hours', () => {
    expect(hoursInMs(0.5)).toEqual(1_800_000);
  });
});

describe(minutesInMs.name, () => {
  test('converts minutes to milliseconds', () => {
    expect(minutesInMs(1)).toEqual(oneMinInMs);
    expect(minutesInMs(5)).toEqual(fiveMinInMs);
  });

  test('returns 0 for 0 minutes', () => {
    expect(minutesInMs(0)).toEqual(0);
  });

  test('returns a negative value for negative minutes', () => {
    expect(minutesInMs(-1)).toEqual(-60_000);
  });

  test('handles fractional minutes', () => {
    expect(minutesInMs(0.5)).toEqual(30_000);
  });
});

describe(secondsInMs.name, () => {
  test('converts seconds to milliseconds', () => {
    expect(secondsInMs(1)).toEqual(1000);
    expect(secondsInMs(60)).toEqual(oneMinInMs);
  });

  test('returns 0 for 0 seconds', () => {
    expect(secondsInMs(0)).toEqual(0);
  });

  test('returns a negative value for negative seconds', () => {
    expect(secondsInMs(-3)).toEqual(-3000);
  });

  test('handles fractional seconds', () => {
    expect(secondsInMs(1.5)).toEqual(1500);
  });
});

describe(weeksInSec.name, () => {
  test('converts weeks to seconds', () => {
    expect(weeksInSec(1)).toEqual(604_800);
    expect(weeksInSec(2)).toEqual(1_209_600);
  });

  test('returns 0 for 0 weeks', () => {
    expect(weeksInSec(0)).toEqual(0);
  });

  test('returns a negative value for negative weeks', () => {
    expect(weeksInSec(-1)).toEqual(-604_800);
  });

  test('handles fractional weeks', () => {
    expect(weeksInSec(0.5)).toEqual(302_400);
  });
});

describe(daysInSec.name, () => {
  test('converts days to seconds', () => {
    expect(daysInSec(1)).toEqual(86_400);
    expect(daysInSec(7)).toEqual(weeksInSec(1));
  });

  test('returns 0 for 0 days', () => {
    expect(daysInSec(0)).toEqual(0);
  });

  test('returns a negative value for negative days', () => {
    expect(daysInSec(-1)).toEqual(-86_400);
  });

  test('handles fractional days', () => {
    expect(daysInSec(0.5)).toEqual(43_200);
  });
});

describe(hoursInSec.name, () => {
  test('converts hours to seconds', () => {
    expect(hoursInSec(1)).toEqual(3600);
    expect(hoursInSec(24)).toEqual(daysInSec(1));
  });

  test('returns 0 for 0 hours', () => {
    expect(hoursInSec(0)).toEqual(0);
  });

  test('returns a negative value for negative hours', () => {
    expect(hoursInSec(-2)).toEqual(-7200);
  });

  test('handles fractional hours', () => {
    expect(hoursInSec(0.5)).toEqual(1800);
  });
});

describe(minutesInSec.name, () => {
  test('converts minutes to seconds', () => {
    expect(minutesInSec(1)).toEqual(60);
    expect(minutesInSec(60)).toEqual(hoursInSec(1));
  });

  test('returns 0 for 0 minutes', () => {
    expect(minutesInSec(0)).toEqual(0);
  });

  test('returns a negative value for negative minutes', () => {
    expect(minutesInSec(-1)).toEqual(-60);
  });

  test('handles fractional minutes', () => {
    expect(minutesInSec(0.5)).toEqual(30);
  });
});
