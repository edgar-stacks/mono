import { describe, expect, it } from 'vitest';

import { createCounter } from './counter';

describe(createCounter.name, () => {
  it('starts at zero by default', () => {
    expect(createCounter().getValue()).toEqual(0);
  });

  it('starts at the given start position', () => {
    expect(createCounter(5).getValue()).toEqual(5);
    expect(createCounter(-3).getValue()).toEqual(-3);
  });

  it('increments by one and returns the new value', () => {
    const counter = createCounter();
    expect(counter.increment()).toEqual(1);
    expect(counter.increment()).toEqual(2);
    expect(counter.getValue()).toEqual(2);
  });

  it('increments by the given amount and returns the new value', () => {
    const counter = createCounter(10);
    expect(counter.incrementBy(5)).toEqual(15);
    expect(counter.incrementBy(0)).toEqual(15);
    expect(counter.incrementBy(-20)).toEqual(-5);
    expect(counter.getValue()).toEqual(-5);
  });

  it('decrements by one and returns the new value', () => {
    const counter = createCounter(1);
    expect(counter.decrement()).toEqual(0);
    expect(counter.decrement()).toEqual(-1);
    expect(counter.getValue()).toEqual(-1);
  });

  it('keeps separate state for each counter', () => {
    const first = createCounter();
    const second = createCounter(100);
    first.increment();
    second.decrement();
    expect(first.getValue()).toEqual(1);
    expect(second.getValue()).toEqual(99);
  });
});
