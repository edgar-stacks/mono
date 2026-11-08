import { describe, expect, it } from 'vitest';

import { formatBytes } from './format-bytes';

describe(formatBytes.name, () => {
  it('formats values below one kilobyte in bytes', () => {
    expect(formatBytes(0)).toEqual('0 B');
    expect(formatBytes(512)).toEqual('512 B');
    expect(formatBytes(1023)).toEqual('1023 B');
  });

  it('uses base 1024 with at most one decimal', () => {
    expect(formatBytes(1024)).toEqual('1 KB');
    expect(formatBytes(1536)).toEqual('1.5 KB');
    expect(formatBytes(1100)).toEqual('1.1 KB');
    expect(formatBytes(2 * 1024 ** 2)).toEqual('2 MB');
    expect(formatBytes(3.25 * 1024 ** 3)).toEqual('3.3 GB');
  });

  it('drops a trailing .0', () => {
    expect(formatBytes(1024 * 1.04)).toEqual('1 KB');
  });

  it('moves to the next unit when rounding reaches 1024', () => {
    expect(formatBytes(1024 ** 2 - 1)).toEqual('1 MB');
  });

  it('stays in the largest unit for very large values', () => {
    expect(formatBytes(2048 * 1024 ** 5)).toEqual('2048 PB');
  });
});
