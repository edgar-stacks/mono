import { wordlist } from '@scure/bip39/wordlists/english';

const redacted = '[redacted]';
const circular = '[circular]';
const minimumMnemonicWords = 12;
const maximumJoinedKeyWords = 3;

const bip39Words = new Set(wordlist);

const sensitiveKeyTerms = new Set([
  'address',
  'addresses',
  'addr',
  'txid',
  'txids',
  'hex',
  'psbt',
  'psbts',
  'tx',
  'txs',
  'raw',
  'outpoint',
  'outpoints',
  'descriptor',
  'descriptors',
  'policy',
  'policies',
  'xpub',
  'xpubs',
  'ypub',
  'zpub',
  'tpub',
  'xprv',
  'tprv',
  'pubkey',
  'pubkeys',
  'publickey',
  'publickeys',
  'fingerprint',
  'fingerprints',
  'keyorigin',
  'keyorigins',
  'keychainid',
  'keychainids',
]);

const secretKeyTerms = new Set([
  'mnemonic',
  'mnemonics',
  'password',
  'passphrase',
  'seed',
  'seedphrase',
  'wif',
  'privkey',
  'privatekey',
  'privatekeys',
  'secretkey',
  'secretkeys',
]);

const collectionKeyTerms = new Set([
  'input',
  'inputs',
  'output',
  'outputs',
  'utxo',
  'utxos',
  'outpoint',
  'outpoints',
  'recipient',
  'recipients',
]);

const base58Chars = '1-9A-HJ-NP-Za-km-z';

const valuePatterns: RegExp[] = [
  new RegExp(`\\b[a-zA-Z](?:pub|prv)[${base58Chars}]{100,}\\b`, 'g'),
  /\bcHNidP[A-Za-z0-9+/]+=*/g,
  new RegExp(`\\b[5KLc][${base58Chars}]{50,51}\\b`, 'g'),
  /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-z]{8,87}\b/gi,
  /\bS[PMTN][0-9A-HJKMNP-TV-Z]{38,40}\b/g,
  /\b(?:0x)?[0-9a-fA-F]{32,}\b/g,
  /\b[0-9a-fA-F]{8}(?=(?:\/\d+['hH]?)+|\])/g,
];

const legacyAddressPattern = new RegExp(`\\b[13mn2][${base58Chars}]{25,34}\\b`, 'g');

const digitPattern = /\d/;

const fingerprintContextPattern = /fingerprint|key ?origin|descriptor|policy/i;

const standaloneFingerprintPattern = /\b[0-9a-fA-F]{8}\b/g;

function redactMnemonics(value: string) {
  const candidates = /[a-z]+(?:[\s,]+[a-z]+){11,}/gi;
  return value.replace(candidates, candidate => {
    const words = Array.from(candidate.matchAll(/[a-z]+/gi));
    let output = '';
    let cursor = 0;
    let runStart = 0;
    for (let index = 0; index <= words.length; index++) {
      const word = words[index];
      if (word && bip39Words.has(word[0].toLowerCase())) continue;
      if (index - runStart >= minimumMnemonicWords) {
        const startMatch = words[runStart];
        const endMatch = words[index - 1];
        if (startMatch && endMatch) {
          const start = startMatch.index;
          const end = endMatch.index + endMatch[0].length;
          output += candidate.slice(cursor, start) + redacted;
          cursor = end;
        }
      }
      runStart = index + 1;
    }
    return output + candidate.slice(cursor);
  });
}

export function redactString(value: string) {
  const withoutMnemonics = redactMnemonics(value);
  const withoutPatterns = valuePatterns.reduce(
    (result, pattern) => result.replace(pattern, redacted),
    withoutMnemonics
  );
  const withoutAddresses = withoutPatterns.replace(legacyAddressPattern, match =>
    digitPattern.test(match.slice(1)) ? redacted : match
  );
  return fingerprintContextPattern.test(withoutAddresses)
    ? withoutAddresses.replace(standaloneFingerprintPattern, redacted)
    : withoutAddresses;
}

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
}

function getJoinedSuffixes(words: string[]) {
  const suffixes: string[] = [];
  for (let size = 1; size <= Math.min(maximumJoinedKeyWords, words.length); size++) {
    suffixes.push(words.slice(-size).join(''));
  }
  return suffixes;
}

function getJoinedWindows(words: string[]) {
  const windows: string[] = [];
  for (let start = 0; start < words.length; start++) {
    for (let size = 1; size <= maximumJoinedKeyWords && start + size <= words.length; size++) {
      windows.push(words.slice(start, start + size).join(''));
    }
  }
  return windows;
}

type KeyKind = 'sensitive' | 'collection' | 'plain';

function classifyKey(key: string): KeyKind {
  const words = splitKeyIntoWords(key);
  if (getJoinedWindows(words).some(word => secretKeyTerms.has(word))) return 'sensitive';
  const suffixes = getJoinedSuffixes(words);
  if (suffixes.some(suffix => sensitiveKeyTerms.has(suffix))) return 'sensitive';
  if (suffixes.some(suffix => collectionKeyTerms.has(suffix))) return 'collection';
  return 'plain';
}

function describeCount(count: number) {
  return `[redacted: ${count} items]`;
}

function readProperty(source: object, key: string): unknown {
  try {
    return Reflect.get(source, key);
  } catch {
    return redacted;
  }
}

function redactEntries(source: object, ancestors: Set<object>, isSensitive: boolean) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    result[key] = redactProperty(key, readProperty(source, key), ancestors, isSensitive);
  }
  return result;
}

function redactError(error: Error, ancestors: Set<object>, isSensitive: boolean) {
  const result: Record<string, unknown> = {
    name: redactValue(readProperty(error, 'name'), ancestors, isSensitive),
    message: redactValue(readProperty(error, 'message'), ancestors, isSensitive),
    stack: redactValue(readProperty(error, 'stack'), ancestors, isSensitive),
    ...redactEntries(error, ancestors, isSensitive),
  };
  if ('cause' in error) {
    result.cause = redactValue(readProperty(error, 'cause'), ancestors, isSensitive);
  }
  return result;
}

function redactObject(value: object, ancestors: Set<object>, isSensitive: boolean): unknown {
  if (ancestors.has(value)) return circular;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redacted;

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => redactValue(item, ancestors, isSensitive));
    if (value instanceof Error) return redactError(value, ancestors, isSensitive);
    if (value instanceof Map) {
      return Array.from(value.entries()).map(entry => redactValue(entry, ancestors, isSensitive));
    }
    if (value instanceof Set) {
      return Array.from(value.values()).map(item => redactValue(item, ancestors, isSensitive));
    }
    return redactEntries(value, ancestors, isSensitive);
  } finally {
    ancestors.delete(value);
  }
}

function redactValue(value: unknown, ancestors: Set<object>, isSensitive: boolean): unknown {
  try {
    if (typeof value === 'string') return isSensitive ? redacted : redactString(value);
    if (typeof value === 'number' || typeof value === 'bigint') {
      return isSensitive ? redacted : value;
    }
    if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
    if (typeof value === 'symbol') return value.toString();
    if (value === null || typeof value !== 'object') return value;
    return redactObject(value, ancestors, isSensitive);
  } catch {
    return redacted;
  }
}

function redactProperty(
  key: string,
  value: unknown,
  ancestors: Set<object>,
  isParentSensitive: boolean
): unknown {
  const kind = classifyKey(key);
  if (kind === 'plain' && !isParentSensitive) return redactValue(value, ancestors, false);
  if (Array.isArray(value) && (kind !== 'plain' || isParentSensitive)) {
    return describeCount(value.length);
  }
  return redactValue(value, ancestors, isParentSensitive || kind === 'sensitive');
}

export function redactLogArgs(args: readonly unknown[]): [msg: string, ...args: unknown[]] {
  const [msg, ...rest] = args;
  const redactedMsg = typeof msg === 'string' ? redactValue(msg, new Set(), false) : redacted;
  return [
    typeof redactedMsg === 'string' ? redactedMsg : redacted,
    ...rest.map(arg => redactValue(arg, new Set(), false)),
  ];
}
