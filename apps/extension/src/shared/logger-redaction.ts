import { wordlist } from '@scure/bip39/wordlists/english';

const redactedPlaceholder = '[redacted]';

const circularPlaceholder = '[circular]';

const minimumMnemonicWordCount = 12;

const sensitiveKeyWords = new Set([
  'address',
  'addresses',
  'descriptor',
  'descriptors',
  'fingerprint',
  'fingerprints',
  'hex',
  'input',
  'inputs',
  'mnemonic',
  'mnemonics',
  'outpoint',
  'outpoints',
  'output',
  'outputs',
  'passphrase',
  'password',
  'passwords',
  'policies',
  'policy',
  'privkey',
  'psbt',
  'psbts',
  'pubkey',
  'pubkeys',
  'seed',
  'seeds',
  'secret',
  'secrets',
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

const sensitiveKeyWordPairs = new Set([
  'key origin',
  'key origins',
  'keychain id',
  'keychain ids',
  'internal key',
  'internal keys',
  'private key',
  'private keys',
  'public key',
  'public keys',
  'secret key',
  'secret keys',
]);

const mnemonicWords = new Set(wordlist);

const base58Characters = '1-9A-HJ-NP-Za-km-z';

const valuePatterns: { pattern: RegExp; isMatchSensitive?(match: string): boolean }[] = [
  { pattern: new RegExp(`\\b[xyztuvYZUV]p(?:ub|rv)[${base58Characters}]{80,}`, 'g') },
  { pattern: /\bcHNidP8[A-Za-z0-9+/]+={0,2}/g },
  { pattern: /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-z]{8,87}\b/gi },
  { pattern: /\bS[MNPT][0-9A-HJKMNP-TV-Z]{28,41}\b/g },
  { pattern: /\b[0-9a-f]{8}(?:\/\d+['hH]?)+/gi },
  { pattern: /\b(?:0x)?[0-9a-f]{32,}\b/gi },
  {
    pattern: new RegExp(`\\b[5KLc][${base58Characters}]{50,51}\\b`, 'g'),
    isMatchSensitive: containsDigitAfterPrefix,
  },
  {
    pattern: new RegExp(`\\b[123mn][${base58Characters}]{25,34}\\b`, 'g'),
    isMatchSensitive: containsDigitAfterPrefix,
  },
];

const fingerprintMentionPattern = /fingerprint/i;

const fingerprintPattern = /\b[0-9a-f]{8}\b/gi;

function containsDigitAfterPrefix(match: string) {
  return /\d/.test(match.slice(1));
}

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
}

function isSensitiveKey(key: string) {
  const words = splitKeyIntoWords(key);
  const lastWord = words.at(-1);
  if (!lastWord) return false;
  return sensitiveKeyWords.has(lastWord) || sensitiveKeyWordPairs.has(words.slice(-2).join(' '));
}

function redactMnemonicRuns(text: string) {
  const tokens = [...text.matchAll(/[a-z]+/gi)];
  const spans: [start: number, end: number][] = [];
  let runStart = 0;
  let runLength = 0;

  function closeRun(endIndex: number) {
    if (runLength >= minimumMnemonicWordCount) {
      const first = tokens[runStart];
      const last = tokens[endIndex];
      spans.push([first.index, last.index + last[0].length]);
    }
    runLength = 0;
  }

  tokens.forEach((token, index) => {
    const isWord = mnemonicWords.has(token[0].toLowerCase());
    const previous = tokens[index - 1];
    const isAdjacent =
      previous !== undefined &&
      /^[\s,]+$/.test(text.slice(previous.index + previous[0].length, token.index));
    if (runLength > 0 && (!isWord || !isAdjacent)) closeRun(index - 1);
    if (!isWord) return;
    if (runLength === 0) runStart = index;
    runLength += 1;
  });
  closeRun(tokens.length - 1);

  return spans.reduceRight(
    (result, [start, end]) => result.slice(0, start) + redactedPlaceholder + result.slice(end),
    text
  );
}

function redactString(text: string) {
  const withoutPatterns = valuePatterns.reduce(
    (result, { pattern, isMatchSensitive }) =>
      result.replace(pattern, match =>
        !isMatchSensitive || isMatchSensitive(match) ? redactedPlaceholder : match
      ),
    text
  );
  const withoutFingerprints = fingerprintMentionPattern.test(withoutPatterns)
    ? withoutPatterns.replace(fingerprintPattern, redactedPlaceholder)
    : withoutPatterns;
  return redactMnemonicRuns(withoutFingerprints);
}

function redactSensitiveKeyValue(value: unknown) {
  if (Array.isArray(value)) return `[${value.length} items redacted]`;
  if (value === null || value === undefined) return value;
  return redactedPlaceholder;
}

function toCustomString(value: object) {
  const toString: unknown = Reflect.get(value, 'toString');
  if (typeof toString !== 'function' || toString === Object.prototype.toString) return;
  const result: unknown = Reflect.apply(toString, value, []);
  return typeof result === 'string' ? result : undefined;
}

function isPlainObject(value: object) {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function redactEntries(value: object, ancestors: WeakSet<object>, target: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    try {
      const entry: unknown = Reflect.get(value, key);
      target[key] = isSensitiveKey(key)
        ? redactSensitiveKeyValue(entry)
        : redactValue(entry, ancestors);
    } catch {
      target[key] = redactedPlaceholder;
    }
  }
  return target;
}

function redactError(error: Error, ancestors: WeakSet<object>) {
  const redacted: Record<string, unknown> = {
    name: redactString(String(error.name)),
    message: redactString(String(error.message)),
  };
  if (error.stack !== undefined) redacted.stack = redactString(String(error.stack));
  if ('cause' in error) redacted.cause = redactValue(error.cause, ancestors);
  return redactEntries(error, ancestors, redacted);
}

function redactObject(value: object, ancestors: WeakSet<object>): unknown {
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redactedPlaceholder;
  if (value instanceof Date) return new Date(value.getTime());
  if (ancestors.has(value)) return circularPlaceholder;
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => redactValue(item, ancestors));
    if (value instanceof Error) return redactError(value, ancestors);
    const customString = isPlainObject(value) ? undefined : toCustomString(value);
    if (customString !== undefined) return redactString(customString);
    return redactEntries(value, ancestors, {});
  } finally {
    ancestors.delete(value);
  }
}

function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  try {
    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'object' && value !== null) return redactObject(value, ancestors);
    return value;
  } catch {
    return redactedPlaceholder;
  }
}

export function redactLogArgs(args: readonly unknown[]): [msg: string, ...rest: unknown[]] {
  const [msg, ...rest] = args.map(arg => redactValue(arg, new WeakSet()));
  return [typeof msg === 'string' ? msg : redactedPlaceholder, ...rest];
}
