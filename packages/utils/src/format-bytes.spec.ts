import { formatBytes } from './format-bytes';

describe(formatBytes.name, () => {
  test('formats zero bytes', () => {
    expect(formatBytes(0)).toEqual('0 B');
  });

  test('formats values below one kilobyte in bytes', () => {
    expect(formatBytes(512)).toEqual('512 B');
    expect(formatBytes(1023)).toEqual('1023 B');
  });

  test('formats kilobytes with one decimal', () => {
    expect(formatBytes(1536)).toEqual('1.5 KB');
  });

  test('drops a trailing .0', () => {
    expect(formatBytes(2097152)).toEqual('2 MB');
  });

  test('stops at terabytes', () => {
    expect(formatBytes(1024 ** 5)).toEqual('1024 TB');
  });
});
