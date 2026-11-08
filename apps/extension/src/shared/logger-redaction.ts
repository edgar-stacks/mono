import { wordlist } from '@scure/bip39/wordlists/english';
import { isPlainObject } from 'remeda';

const redacted = '[redacted]';

const circular = '[circular]';

const minimumMnemonicWordCount = 12;

const bip39Words = new Set(wordlist);

const sensitiveKeys = new Set([
  'address',
  'addresses',
  'descriptor',
  'descriptors',
  'fingerprint',
  'fingerprints',
  'hex',
  'inputs',
  'keychainid',
  'keychainids',
  'keyorigin',
  'keyorigins',
  'mnemonic',
  'mnemonics',
  'outpoint',
  'outpoints',
  'outputs',
  'passphrase',
  'password',
  'policies',
  'policy',
  'privatekey',
  'privatekeys',
  'psbt',
  'psbts',
  'pubkey',
  'pubkeys',
  'publickey',
  'publickeys',
  'rawtx',
  'recipients',
  'secret',
  'secretkey',
  'secretkeys',
  'seed',
  'tpub',
  'tx',
  'txid',
  'txids',
  'txs',
  'utxo',
  'utxos',
  'wif',
  'xprv',
  'xpub',
  'xpubs',
  'zpub',
]);

const numericSensitiveKeys = new Set(['fingerprint', 'fingerprints']);

const extendedKeyPattern = /\b[tuvxyzTUVYZ]p(?:ub|rv)[1-9A-HJ-NP-Za-km-z]{20,}\b/g;
const psbtBase64Pattern = /cHNidP8[A-Za-z0-9+/]*={0,2}/g;
const bech32AddressPattern = /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-z]{20,}\b/gi;
const stacksAddressPattern = /\bS[MNPT][0-9A-HJKMNP-TV-Z]{28,41}\b/g;
const wifPattern = /\b[5KLc][1-9A-HJ-NP-Za-km-z]{50,51}\b/g;
const legacyAddressPattern = /\b[123mn][1-9A-HJ-NP-Za-km-z]{25,34}\b/g;
const fingerprintWithPathPattern = /\b[0-9a-f]{8}(?:\/\d+['hH]?)+/gi;
const bracketedFingerprintPattern = /\[[0-9a-f]{8}\]/gi;
const longHexPattern = /\b(?:0x)?[0-9a-f]{32,}\b/gi;
const fingerprintContextPattern = /fingerprint/i;
const standaloneFingerprintPattern = /\b[0-9a-f]{8}\b/gi;
const wordRunPattern = /[a-z]+(?:[\s,]+[a-z]+){11,}/gi;
const wordSeparatorPattern = /[\s,]+/;

function redactIfContainsDigit(candidate: string) {
  return /\d/.test(candidate.slice(1)) ? redacted : candidate;
}

function hasMnemonicRun(words: string[]) {
  let streak = 0;
  for (const word of words) {
    streak = bip39Words.has(word.toLowerCase()) ? streak + 1 : 0;
    if (streak >= minimumMnemonicWordCount) return true;
  }
  return false;
}

function redactMnemonicRun(candidate: string) {
  return hasMnemonicRun(candidate.split(wordSeparatorPattern)) ? redacted : candidate;
}

function redactLogString(value: string) {
  const result = value
    .replace(wordRunPattern, redactMnemonicRun)
    .replace(extendedKeyPattern, redacted)
    .replace(psbtBase64Pattern, redacted)
    .replace(bech32AddressPattern, redacted)
    .replace(stacksAddressPattern, redacted)
    .replace(wifPattern, redactIfContainsDigit)
    .replace(legacyAddressPattern, redactIfContainsDigit)
    .replace(fingerprintWithPathPattern, redacted)
    .replace(bracketedFingerprintPattern, redacted)
    .replace(longHexPattern, redacted);
  return fingerprintContextPattern.test(result)
    ? result.replace(standaloneFingerprintPattern, redacted)
    : result;
}

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_.-]+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
}

function getSensitiveKeyName(key: string | undefined) {
  if (!key) return undefined;
  const words = splitKeyIntoWords(key);
  const lastWord = words.at(-1);
  const lastTwoWords = words.slice(-2).join('');
  if (sensitiveKeys.has(lastTwoWords)) return lastTwoWords;
  if (lastWord && sensitiveKeys.has(lastWord)) return lastWord;
  return undefined;
}

function isRequestBody(key: string | undefined, parentKey: string | undefined) {
  return key === 'data' && parentKey === 'config';
}

function readProperty(target: object, key: string) {
  try {
    const value: unknown = Reflect.get(target, key);
    return { value };
  } catch {
    return undefined;
  }
}

interface RedactContext {
  key?: string;
  parentKey?: string;
  seen: WeakSet<object>;
}

function redactProperties(target: object, { key, seen }: RedactContext) {
  const copy: Record<string, unknown> = {};
  for (const propertyKey of Object.keys(target)) {
    const property = readProperty(target, propertyKey);
    copy[propertyKey] = property
      ? redactValue(property.value, { key: propertyKey, parentKey: key, seen })
      : redacted;
  }
  return copy;
}

function redactError(error: Error, context: RedactContext) {
  const message = readProperty(error, 'message');
  const copy = new Error(
    message && typeof message.value === 'string' ? redactLogString(message.value) : redacted
  );
  const name = readProperty(error, 'name');
  copy.name = name && typeof name.value === 'string' ? redactLogString(name.value) : 'Error';
  const stack = readProperty(error, 'stack');
  copy.stack = stack && typeof stack.value === 'string' ? redactLogString(stack.value) : undefined;
  Object.assign(copy, redactProperties(error, context));
  if (Object.hasOwn(error, 'cause')) {
    const cause = readProperty(error, 'cause');
    Object.defineProperty(copy, 'cause', {
      value: cause ? redactValue(cause.value, { key: 'cause', seen: context.seen }) : redacted,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  return copy;
}

function redactSensitiveValue(value: unknown, sensitiveKeyName: string) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' || typeof value === 'bigint') {
    return numericSensitiveKeys.has(sensitiveKeyName) ? redacted : value;
  }
  if (Array.isArray(value)) return `[redacted: ${value.length} items]`;
  return redacted;
}

function redactObject(value: object, context: RedactContext): unknown {
  if (context.seen.has(value)) return circular;
  context.seen.add(value);
  try {
    if (value instanceof Error) return redactError(value, context);
    if (Array.isArray(value)) {
      return value.map(item =>
        redactValue(item, { key: context.key, parentKey: context.parentKey, seen: context.seen })
      );
    }
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redacted;
    if (isPlainObject(value)) return redactProperties(value, context);
    const toJSON = readProperty(value, 'toJSON');
    if (toJSON && typeof toJSON.value === 'function') {
      const json: unknown = Reflect.apply(toJSON.value, value, []);
      return redactValue(json, context);
    }
    return redactProperties(value, context);
  } finally {
    context.seen.delete(value);
  }
}

function redactValue(value: unknown, context: RedactContext): unknown {
  try {
    if (isRequestBody(context.key, context.parentKey)) return redacted;
    const sensitiveKeyName = getSensitiveKeyName(context.key);
    if (sensitiveKeyName && !(value instanceof Error)) {
      return redactSensitiveValue(value, sensitiveKeyName);
    }
    if (typeof value === 'string') return redactLogString(value);
    if (typeof value === 'object' && value !== null) return redactObject(value, context);
    return value;
  } catch {
    return redacted;
  }
}

export function redactLogArgs(args: unknown[]): unknown[] {
  const seen = new WeakSet<object>();
  return args.map(arg => redactValue(arg, { seen }));
}
