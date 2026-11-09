const bytesPerKilobyte = 1024;
const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatBytes(bytes: number): string {
  let unitIndex = 0;
  let value = bytes;

  while (
    unitIndex < byteUnits.length - 1 &&
    roundToOneDecimal(Math.abs(value)) >= bytesPerKilobyte
  ) {
    value /= bytesPerKilobyte;
    unitIndex += 1;
  }

  return `${roundToOneDecimal(value)} ${byteUnits[unitIndex]}`;
}
