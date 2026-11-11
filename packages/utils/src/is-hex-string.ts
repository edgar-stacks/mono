export function isHexString(value: string) {
  return /^[0-9a-fA-F]+$/.test(value);
}
