import { wordlist } from '@scure/bip39/wordlists/english';
import BigNumber from 'bignumber.js';

const redacted = '[redacted]';
const circular = '[circular]';

const minimumMnemonicWordCount = 12;

const sensitiveKeyTerms = new Set(
  [
    'address',
    'txid',
    'tx',
    'hex',
    'psbt',
    'descriptor',
    'xpub',
    'publickey',
    'fingerprint',
    'keyorigin',
    'keychainid',
    'mnemonic',
    'phrase',
    'privatekey',
    'wif',
    'password',
    'seed',
    'utxo',
    'outpoint',
    'script',
    'signature',
  ]
    .flatMap(term => [term, `${term}s`])
    .concat(['addresses', 'hexes', 'policy', 'policies', 'inputs', 'outputs'])
);

const readableKeySuffixes = new Set([
  'index',
  'type',
  'count',
  'length',
  'size',
  'version',
  'format',
  'status',
]);

const bip39Words = new Set(wordlist);

const base58Chars = '1-9A-HJ-NP-Za-km-z';

const psbtBase64Pattern = /cHNidP8[A-Za-z0-9+/]*={0,2}/g;
const extendedKeyPattern = new RegExp(`\\b[xyztuvXYZTUV](?:pub|prv)[${base58Chars}]{100,}\\b`, 'g');
const bech32AddressPattern = /\b(?:bc|tb|bcrt)1[ac-hj-np-z02-9]{8,87}\b/gi;
const stacksAddressPattern = /\bS[PMTN][0-9A-HJKMNP-TV-Z]{28,41}\b/g;
const wifPattern = new RegExp(`\\b[5KLc9][${base58Chars}]{50,51}\\b`, 'g');
const legacyAddressPattern = new RegExp(`\\b[123mn][${base58Chars}]{25,34}\\b`, 'g');
const outpointPattern = /\b[0-9a-fA-F]{64}:\d+\b/g;
const hexRunPattern = /\b(?:0x)?[0-9a-fA-F]{32,}\b/g;
const keyOriginFingerprintPattern = /\b[0-9a-fA-F]{8}(?=\/\d+['h]?)/g;
const standaloneFingerprintPattern = /\b[0-9a-fA-F]{8}\b/g;
const fingerprintWordPattern = /fingerprint/i;
const wordRunPattern = /[A-Za-z]+(?:[ ,]+[A-Za-z]+)+/g;
const wordRunSeparatorPattern = /([ ,]+)/;
const digitPattern = /\d/;

function splitKeyWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
}

function isSensitiveKey(key: string) {
  const words = splitKeyWords(key);
  const lastWord = words.at(-1);
  if (lastWord && readableKeySuffixes.has(lastWord)) return false;
  return words.some(
    (word, index) =>
      sensitiveKeyTerms.has(word) || sensitiveKeyTerms.has(`${word}${words[index + 1] ?? ''}`)
  );
}

function redactWhenContainsDigit(match: string) {
  return digitPattern.test(match) ? redacted : match;
}

function joinWords(words: string[], separators: string[], start: number, end: number) {
  return words
    .slice(start, end)
    .map((word, offset) =>
      start + offset < end - 1 ? `${word}${separators[start + offset]}` : word
    )
    .join('');
}

function redactMnemonicRuns(wordRun: string) {
  const parts = wordRun.split(wordRunSeparatorPattern);
  const words = parts.filter((_, index) => index % 2 === 0);
  const separators = parts.filter((_, index) => index % 2 === 1);
  const result: string[] = [];
  let wordIndex = 0;

  while (wordIndex < words.length) {
    let runEnd = wordIndex;
    while (runEnd < words.length && bip39Words.has(words[runEnd].toLowerCase())) runEnd += 1;
    const isMnemonicRun = runEnd - wordIndex >= minimumMnemonicWordCount;
    const stop = Math.max(runEnd, wordIndex + 1);
    result.push(isMnemonicRun ? redacted : joinWords(words, separators, wordIndex, stop));
    if (stop < words.length) result.push(separators[stop - 1]);
    wordIndex = stop;
  }

  return result.join('');
}

function redactString(value: string) {
  const redactedValue = value
    .replace(psbtBase64Pattern, redacted)
    .replace(extendedKeyPattern, redacted)
    .replace(bech32AddressPattern, redacted)
    .replace(stacksAddressPattern, redacted)
    .replace(wifPattern, redactWhenContainsDigit)
    .replace(legacyAddressPattern, redactWhenContainsDigit)
    .replace(outpointPattern, redacted)
    .replace(hexRunPattern, redacted)
    .replace(keyOriginFingerprintPattern, redacted)
    .replace(wordRunPattern, redactMnemonicRuns);
  if (!fingerprintWordPattern.test(redactedValue)) return redactedValue;
  return redactedValue.replace(standaloneFingerprintPattern, redacted);
}

function redactSensitiveValue(value: unknown) {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value === null || value === undefined) return value;
  return redacted;
}

function redactEntry(key: string, value: unknown, ancestors: Set<object>) {
  if (isSensitiveKey(key)) return redactSensitiveValue(value);
  return redactValue(value, ancestors);
}

function readProperty(source: object, key: string): unknown {
  return Reflect.get(source, key);
}

function redactProperties(source: object, keys: string[], ancestors: Set<object>) {
  const result: Record<string, unknown> = {};
  keys.forEach(key => {
    result[key] = redactEntry(key, readProperty(source, key), ancestors);
  });
  return result;
}

const errorKeys = ['name', 'message', 'stack', 'cause'];

function redactError(error: Error, ancestors: Set<object>) {
  const presentErrorKeys = errorKeys.filter(key => key in error);
  const ownKeys = Object.keys(error).filter(key => !errorKeys.includes(key));
  return redactProperties(error, [...presentErrorKeys, ...ownKeys], ancestors);
}

function redactObject(value: object, ancestors: Set<object>): unknown {
  if (ancestors.has(value)) return circular;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  if (BigNumber.isBigNumber(value)) return value.toString();
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redacted;

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => redactValue(item, ancestors));
    if (value instanceof Error) return redactError(value, ancestors);
    return redactProperties(value, Object.keys(value), ancestors);
  } catch {
    return redacted;
  } finally {
    ancestors.delete(value);
  }
}

function redactValue(value: unknown, ancestors: Set<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'object' && value !== null) return redactObject(value, ancestors);
  return value;
}

function redactUnknown(value: unknown) {
  try {
    return redactValue(value, new Set());
  } catch {
    return redacted;
  }
}

export function redactLogMessage(message: unknown): string {
  try {
    if (typeof message === 'string') return redactString(message);
    const serialized = JSON.stringify(redactUnknown(message));
    return typeof serialized === 'string' ? serialized : redacted;
  } catch {
    return redacted;
  }
}

export function redactLogArgs(args: unknown[]): unknown[] {
  return args.map(redactUnknown);
}
