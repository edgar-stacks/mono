const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
const bytesPerUnit = 1024;

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatBytes(bytes: number): string {
  let unitIndex = 0;
  let value = roundToOneDecimal(bytes);
  while (value >= bytesPerUnit && unitIndex < byteUnits.length - 1) {
    unitIndex += 1;
    value = roundToOneDecimal(bytes / bytesPerUnit ** unitIndex);
  }
  return `${value} ${byteUnits[unitIndex]}`;
}
