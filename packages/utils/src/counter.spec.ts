import { createCounter } from './counter';

describe(createCounter.name, () => {
  test('starts at zero by default', () => {
    expect(createCounter().getValue()).toEqual(0);
  });

  test('starts at the given start position', () => {
    expect(createCounter(5).getValue()).toEqual(5);
  });

  test('increment adds one and returns the new value', () => {
    const counter = createCounter(2);
    expect(counter.increment()).toEqual(3);
    expect(counter.getValue()).toEqual(3);
  });

  test('incrementBy adds the given amount and returns the new value', () => {
    const counter = createCounter(2);
    expect(counter.incrementBy(10)).toEqual(12);
    expect(counter.getValue()).toEqual(12);
  });

  test('decrement subtracts one and returns the new value', () => {
    const counter = createCounter(2);
    expect(counter.decrement()).toEqual(1);
    expect(counter.getValue()).toEqual(1);
  });

  test('keeps state across calls', () => {
    const counter = createCounter();
    counter.increment();
    counter.incrementBy(4);
    counter.decrement();
    expect(counter.getValue()).toEqual(4);
  });

  test('keeps separate state per counter', () => {
    const first = createCounter();
    const second = createCounter(10);
    first.increment();
    expect(first.getValue()).toEqual(1);
    expect(second.getValue()).toEqual(10);
  });
});
