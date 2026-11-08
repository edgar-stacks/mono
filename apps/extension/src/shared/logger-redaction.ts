import { wordlist } from '@scure/bip39/wordlists/english';
import { isPlainObject } from 'remeda';

const redacted = '[redacted]';
const circular = '[circular]';
const maxDepth = 12;
const minMnemonicWordCount = 12;

const bip39Words = new Set(wordlist);

const sensitiveKeyWords = new Set([
  'address',
  'addresses',
  'descriptor',
  'descriptors',
  'fingerprint',
  'fingerprints',
  'input',
  'inputs',
  'mnemonic',
  'outpoint',
  'outpoints',
  'output',
  'outputs',
  'passphrase',
  'password',
  'policies',
  'policy',
  'privkey',
  'psbt',
  'psbts',
  'pubkey',
  'pubkeys',
  'recipient',
  'recipients',
  'script',
  'secret',
  'seed',
  'signature',
  'tx',
  'txid',
  'txids',
  'txs',
  'utxo',
  'utxos',
  'wif',
  'witness',
  'xprv',
  'xpub',
  'xpubs',
]);

const sensitiveKeyWordPairs = new Set([
  'keychainid',
  'keychainids',
  'keyorigin',
  'keyorigins',
  'privatekey',
  'privatekeys',
  'publickey',
  'publickeys',
  'secretkey',
  'secretkeys',
]);

const sensitiveLastKeyWords = new Set(['body', 'data', 'hex', 'params', 'payload']);

const readableKeyQualifiers = new Set([
  'count',
  'index',
  'length',
  'size',
  'total',
  'type',
  'types',
]);

const outpointOrHexPattern = /\b(?:0x)?[0-9a-fA-F]{32,}(?::\d+)?\b/g;
const keyOriginPattern = /\[?\b[0-9a-fA-F]{8}(?:\/\d+['hH]?)+\]?/g;
const extendedKeyPattern = /\b[a-zA-Z](?:pub|prv)[1-9A-HJ-NP-Za-km-z]{50,}\b/g;
const psbtBase64Pattern = /cHNidP8[A-Za-z0-9+/=]*/g;
const bech32AddressPattern = /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-zAC-HJ-NP-Z]{8,87}\b/gi;
const stacksAddressPattern = /\bS[MNPT][0-9A-HJKMNP-Z]{38,39}\b/g;
const wifPattern = /\b[5KLc][1-9A-HJ-NP-Za-km-z]{50,51}\b/g;
const legacyAddressPattern = /\b[123mn][1-9A-HJ-NP-Za-km-z]{25,34}\b/g;
const wordRunPattern = /[a-zA-Z]+(?:[\s,]+[a-zA-Z]+)*/g;
const wordSeparatorPattern = /[\s,]+/;
const digitPattern = /\d/;

function redactMnemonicRuns(value: string) {
  return value.replace(wordRunPattern, run => {
    const words = run.split(wordSeparatorPattern);
    if (words.length < minMnemonicWordCount) return run;
    const parts: string[] = [];
    let mnemonicRun: string[] = [];
    function flush() {
      if (mnemonicRun.length >= minMnemonicWordCount) parts.push(redacted);
      else parts.push(...mnemonicRun);
      mnemonicRun = [];
    }
    for (const word of words) {
      if (bip39Words.has(word.toLowerCase())) {
        mnemonicRun.push(word);
        continue;
      }
      flush();
      parts.push(word);
    }
    flush();
    return parts.length === words.length ? run : parts.join(' ');
  });
}

function redactString(value: string) {
  return redactMnemonicRuns(
    value
      .replace(psbtBase64Pattern, redacted)
      .replace(keyOriginPattern, redacted)
      .replace(extendedKeyPattern, redacted)
      .replace(outpointOrHexPattern, redacted)
      .replace(bech32AddressPattern, redacted)
      .replace(stacksAddressPattern, redacted)
      .replace(wifPattern, redacted)
      .replace(legacyAddressPattern, match =>
        digitPattern.test(match.slice(1)) ? redacted : match
      )
  );
}

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(word => word.toLowerCase());
}

function isSensitiveKey(key: string) {
  const words = splitKeyIntoWords(key);
  const lastWord = words.at(-1);
  if (!lastWord) return false;
  if (words.length > 1 && readableKeyQualifiers.has(lastWord)) return false;
  if (sensitiveLastKeyWords.has(lastWord)) return true;
  return words.some(
    (word, index) =>
      sensitiveKeyWords.has(word) || sensitiveKeyWordPairs.has(word + (words[index + 1] ?? ''))
  );
}

function redactSensitiveKeyValue(value: unknown) {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  return redacted;
}

function readProperty(source: object, key: string) {
  try {
    const value: unknown = Reflect.get(source, key);
    return { value };
  } catch {
    return null;
  }
}

function redactValue(value: unknown, ancestors: WeakSet<object>, depth: number): unknown {
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object' || value === null) return value;
  if (depth > maxDepth) return redacted;
  if (ancestors.has(value)) return circular;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redacted;

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => redactValue(item, ancestors, depth + 1));

    if (value instanceof Error) {
      const result: Record<string, unknown> = {};
      for (const key of new Set(['name', 'message', 'stack', ...Object.keys(value), 'cause'])) {
        const property = readProperty(value, key);
        if (!property) {
          result[key] = redacted;
          continue;
        }
        if (property.value === undefined) continue;
        result[key] = redactEntry(key, property.value, ancestors, depth);
      }
      return result;
    }

    if (!isPlainObject(value) && 'toJSON' in value && typeof value.toJSON === 'function') {
      const json: unknown = Reflect.apply(value.toJSON, value, []);
      return redactValue(json, ancestors, depth + 1);
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const property = readProperty(value, key);
      result[key] = property ? redactEntry(key, property.value, ancestors, depth) : redacted;
    }
    return result;
  } catch {
    return redacted;
  } finally {
    ancestors.delete(value);
  }
}

function redactEntry(key: string, value: unknown, ancestors: WeakSet<object>, depth: number) {
  if (isSensitiveKey(key)) return redactSensitiveKeyValue(value);
  return redactValue(value, ancestors, depth + 1);
}

function safelyRedact(value: unknown) {
  try {
    return redactValue(value, new WeakSet(), 0);
  } catch {
    return redacted;
  }
}

export function redactLogArgs(args: readonly unknown[]): [string, ...unknown[]] {
  const [msg, ...rest] = args;
  const redactedMsg = typeof msg === 'string' ? safelyRedact(msg) : redacted;
  return [
    typeof redactedMsg === 'string' ? redactedMsg : redacted,
    ...rest.map(arg => safelyRedact(arg)),
  ];
}
