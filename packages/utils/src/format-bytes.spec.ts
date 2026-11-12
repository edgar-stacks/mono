import { formatBytes } from './format-bytes';

describe(formatBytes.name, () => {
  test.each([
    [0, '0 B'],
    [512, '512 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [2097152, '2 MB'],
    [1024 ** 3, '1 GB'],
    [1024 ** 4, '1 TB'],
    [1024 ** 5, '1024 TB'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toEqual(expected);
  });
});
