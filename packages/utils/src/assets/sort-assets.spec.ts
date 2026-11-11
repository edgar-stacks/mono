import { describe, expect, it } from 'vitest';

import { sortAssetsByName } from './sort-assets';

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(rest => [item, ...rest])
  );
}

describe(sortAssetsByName.name, () => {
  it('orders BTC, then STX, then the rest by name for every input order', () => {
    const names = ['WELSH', 'BTC', 'ALEX', 'STX'];

    permutations(names).forEach(permutation => {
      const result = sortAssetsByName(permutation.map(name => ({ name })));
      expect(result.map(asset => asset.name)).toEqual(['BTC', 'STX', 'ALEX', 'WELSH']);
    });
  });

  it('returns a new array and leaves the input unchanged', () => {
    const input = [{ name: 'WELSH' }, { name: 'BTC' }, { name: 'ALEX' }, { name: 'STX' }];
    const inputCopy = [...input];

    const output = sortAssetsByName(input);

    expect(output).not.toBe(input);
    expect(input).toEqual(inputCopy);
  });
});
