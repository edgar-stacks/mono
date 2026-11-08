const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
const bytesPerUnit = 1024;

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatBytes(bytes: number): string {
  let unitIndex = 0;
  let value = bytes;
  while (unitIndex < byteUnits.length - 1 && roundToOneDecimal(value) >= bytesPerUnit) {
    value /= bytesPerUnit;
    unitIndex += 1;
  }
  return `${roundToOneDecimal(value)} ${byteUnits[unitIndex]}`;
}
