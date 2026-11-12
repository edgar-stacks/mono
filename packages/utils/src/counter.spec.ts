import { createCounter } from './counter';

describe(createCounter.name, () => {
  test('starts at 0 by default', () => {
    expect(createCounter().getValue()).toEqual(0);
  });

  test('starts at a custom position', () => {
    expect(createCounter(5).getValue()).toEqual(5);
  });

  test('increment returns the new value', () => {
    const counter = createCounter();
    expect(counter.increment()).toEqual(1);
    expect(counter.increment()).toEqual(2);
    expect(counter.getValue()).toEqual(2);
  });

  test('incrementBy returns the new value', () => {
    const counter = createCounter(2);
    expect(counter.incrementBy(3)).toEqual(5);
    expect(counter.getValue()).toEqual(5);
  });

  test('incrementBy 0 leaves the value unchanged', () => {
    const counter = createCounter(4);
    expect(counter.incrementBy(0)).toEqual(4);
    expect(counter.getValue()).toEqual(4);
  });

  test('incrementBy a negative amount lowers the value', () => {
    const counter = createCounter(4);
    expect(counter.incrementBy(-6)).toEqual(-2);
    expect(counter.getValue()).toEqual(-2);
  });

  test('decrement returns the new value', () => {
    const counter = createCounter(1);
    expect(counter.decrement()).toEqual(0);
    expect(counter.decrement()).toEqual(-1);
    expect(counter.getValue()).toEqual(-1);
  });

  test('two counters are independent', () => {
    const first = createCounter();
    const second = createCounter(10);
    first.increment();
    second.decrement();
    expect(first.getValue()).toEqual(1);
    expect(second.getValue()).toEqual(9);
  });
});
