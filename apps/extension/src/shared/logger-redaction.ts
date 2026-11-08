import { wordlist } from '@scure/bip39/wordlists/english';

const redactedValue = '[redacted]';
const circularValue = '[circular]';
const maxDepth = 10;
const minimumMnemonicWordCount = 12;
const base58Characters = '1-9A-HJ-NP-Za-km-z';

const sensitiveKeyWords = new Set([
  'address',
  'addresses',
  'txid',
  'txids',
  'hex',
  'psbt',
  'psbts',
  'tx',
  'txs',
  'descriptor',
  'descriptors',
  'policy',
  'policies',
  'xpub',
  'xpubs',
  'xprv',
  'pubkey',
  'pubkeys',
  'fingerprint',
  'fingerprints',
  'mnemonic',
  'mnemonics',
  'password',
  'passwords',
  'passphrase',
  'seed',
  'seeds',
  'secret',
  'secrets',
  'wif',
  'outpoint',
  'outpoints',
  'signature',
  'signatures',
  'utxo',
  'utxos',
  'inputs',
  'outputs',
]);

const keyQualifierWords = [
  'public',
  'private',
  'secret',
  'pub',
  'priv',
  'extended',
  'signing',
  'master',
  'root',
  'internal',
];

const sensitiveCompoundKeyWords = new Map([
  ['key', new Set(keyQualifierWords)],
  ['keys', new Set(keyQualifierWords)],
  ['origin', new Set(['key'])],
  ['origins', new Set(['key'])],
  ['id', new Set(['keychain', 'tx'])],
  ['ids', new Set(['keychain', 'tx'])],
  ['phrase', new Set(['secret', 'seed', 'recovery'])],
]);

const errorPayloadKeyWords = new Set(['data', 'body', 'payload']);

const mnemonicWords = new Set(wordlist);
const wordPattern = /[a-z]+/gi;
const mnemonicSeparatorPattern = /^[\s,]+$/;
const legacyAddressPattern = new RegExp(`\\b[13mn2][${base58Characters}]{25,34}\\b`, 'g');
const digitPattern = /\d/;
const fingerprintContextPattern = /fingerprint/i;
const standaloneFingerprintPattern = /\b[0-9a-f]{8}\b/gi;

const valuePatterns = [
  new RegExp(`\\b[a-z]{4}[${base58Characters}]{100,108}\\b`, 'gi'),
  /\bcHNidP8[A-Za-z0-9+/]*={0,2}/g,
  /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-z]{11,87}\b/gi,
  /\bS[PMTN][0-9A-HJKMNP-TV-Z]{33,39}\b/g,
  new RegExp(`\\b[5KLc][${base58Characters}]{50,51}\\b`, 'g'),
  /\b(?:0x)?[0-9a-f]{32,}\b/gi,
  /\[?\b[0-9a-f]{8}(?:\/\d+['hH]?)+\]?/gi,
];

interface RedactionContext {
  ancestors: WeakSet<object>;
  depth: number;
  isInsideError: boolean;
}

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isSensitiveKey(key: string, isInsideError: boolean) {
  const words = splitKeyIntoWords(key);
  const lastWord = words.at(-1);
  if (!lastWord) return false;
  if (sensitiveKeyWords.has(lastWord)) return true;
  if (isInsideError && errorPayloadKeyWords.has(lastWord)) return true;
  const previousWord = words.at(-2);
  if (!previousWord) return false;
  return sensitiveCompoundKeyWords.get(lastWord)?.has(previousWord) ?? false;
}

function redactMnemonics(value: string) {
  const runs: { start: number; end: number; count: number }[] = [];
  for (const match of value.matchAll(wordPattern)) {
    const word = match[0];
    if (!mnemonicWords.has(word.toLowerCase())) continue;
    const start = match.index ?? 0;
    const end = start + word.length;
    const lastRun = runs.at(-1);
    if (lastRun && mnemonicSeparatorPattern.test(value.slice(lastRun.end, start))) {
      lastRun.end = end;
      lastRun.count += 1;
    } else {
      runs.push({ start, end, count: 1 });
    }
  }
  return runs
    .filter(run => run.count >= minimumMnemonicWordCount)
    .reverse()
    .reduce(
      (result, run) => result.slice(0, run.start) + redactedValue + result.slice(run.end),
      value
    );
}

function redactFingerprints(value: string) {
  if (!fingerprintContextPattern.test(value)) return value;
  return value.replace(standaloneFingerprintPattern, redactedValue);
}

function redactLegacyAddresses(value: string) {
  return value.replace(legacyAddressPattern, match =>
    digitPattern.test(match) ? redactedValue : match
  );
}

function redactString(value: string) {
  try {
    const withoutPatterns = valuePatterns.reduce(
      (result, pattern) => result.replace(pattern, redactedValue),
      value
    );
    return redactMnemonics(redactFingerprints(redactLegacyAddresses(withoutPatterns)));
  } catch {
    return redactedValue;
  }
}

function redactSensitiveValue(value: unknown) {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value === null || value === undefined || typeof value === 'boolean') return value;
  return redactedValue;
}

function readProperty(value: object, key: string): unknown {
  try {
    return Reflect.get(value, key);
  } catch {
    return redactedValue;
  }
}

function redactEntries(source: object, keys: string[], context: RedactionContext) {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const propertyValue = readProperty(source, key);
    result[key] = isSensitiveKey(key, context.isInsideError)
      ? redactSensitiveValue(propertyValue)
      : redactValue(propertyValue, context);
  }
  return result;
}

function redactError(error: Error, context: RedactionContext) {
  const errorContext = { ...context, isInsideError: true };
  const enumerableKeys = Object.keys(error).filter(
    key => !['name', 'message', 'stack', 'cause'].includes(key)
  );
  return {
    ...redactEntries(error, ['name', 'message', 'stack'], errorContext),
    ...('cause' in error ? redactEntries(error, ['cause'], errorContext) : {}),
    ...redactEntries(error, enumerableKeys, errorContext),
  };
}

function redactObject(value: object, context: RedactionContext): unknown {
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redactedValue;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(item => redactValue(item, context));
  if (value instanceof Error) return redactError(value, context);
  return redactEntries(value, Object.keys(value), context);
}

function redactValue(value: unknown, context: RedactionContext): unknown {
  try {
    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'bigint') return redactString(value.toString());
    if (typeof value === 'function' || typeof value === 'symbol') return redactedValue;
    if (value === null || typeof value !== 'object') return value;
    if (context.ancestors.has(value)) return circularValue;
    if (context.depth >= maxDepth) return redactedValue;
    context.ancestors.add(value);
    try {
      return redactObject(value, { ...context, depth: context.depth + 1 });
    } finally {
      context.ancestors.delete(value);
    }
  } catch {
    return redactedValue;
  }
}

export function redactLogArgs(args: readonly unknown[]): [msg: string, ...args: unknown[]] {
  const [msg, ...rest] = args;
  const context: RedactionContext = {
    ancestors: new WeakSet(),
    depth: 0,
    isInsideError: false,
  };
  return [
    typeof msg === 'string' ? redactString(msg) : redactedValue,
    ...rest.map(arg => redactValue(arg, context)),
  ];
}
