import { formatBytes } from './format-bytes';

describe(formatBytes.name, () => {
  test('formats zero bytes', () => {
    expect(formatBytes(0)).toEqual('0 B');
  });

  test('formats values below one kilobyte as bytes', () => {
    expect(formatBytes(512)).toEqual('512 B');
    expect(formatBytes(1023)).toEqual('1023 B');
  });

  test('formats kilobytes with at most one decimal', () => {
    expect(formatBytes(1024)).toEqual('1 KB');
    expect(formatBytes(1536)).toEqual('1.5 KB');
    expect(formatBytes(1100)).toEqual('1.1 KB');
  });

  test('drops a trailing .0', () => {
    expect(formatBytes(2 * 1024 * 1024)).toEqual('2 MB');
    expect(formatBytes(1025)).toEqual('1 KB');
  });

  test('moves to the next unit when rounding reaches 1024', () => {
    expect(formatBytes(1024 * 1024 - 1)).toEqual('1 MB');
  });

  test('formats gigabytes and terabytes', () => {
    expect(formatBytes(1.5 * 1024 ** 3)).toEqual('1.5 GB');
    expect(formatBytes(3 * 1024 ** 4)).toEqual('3 TB');
  });

  test('stays in terabytes for larger values', () => {
    expect(formatBytes(2048 * 1024 ** 4)).toEqual('2048 TB');
  });
});
