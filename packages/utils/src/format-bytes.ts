const bytesBase = 1024;
const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return `0 ${byteUnits[0]}`;
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(bytesBase)),
    byteUnits.length - 1
  );
  const value = Number((bytes / bytesBase ** unitIndex).toFixed(1));
  return `${value} ${byteUnits[unitIndex]}`;
}
