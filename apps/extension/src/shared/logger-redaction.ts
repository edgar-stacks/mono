import { wordlist } from '@scure/bip39/wordlists/english';

const redacted = '[redacted]';

const circular = '[circular]';

const minimumMnemonicWordCount = 12;

const bip39Words = new Set(wordlist);

const sensitiveKeyTerms = [
  ['address'],
  ['addresses'],
  ['txid'],
  ['txids'],
  ['tx', 'id'],
  ['tx', 'ids'],
  ['tx', 'hash'],
  ['tx'],
  ['txs'],
  ['hex'],
  ['psbt'],
  ['psbts'],
  ['outpoint'],
  ['outpoints'],
  ['utxo'],
  ['utxos'],
  ['inputs'],
  ['outputs'],
  ['script'],
  ['scripts'],
  ['descriptor'],
  ['descriptors'],
  ['policy'],
  ['policies'],
  ['xpub'],
  ['xpubs'],
  ['xprv'],
  ['tpub'],
  ['tprv'],
  ['ypub'],
  ['zpub'],
  ['public', 'key'],
  ['public', 'keys'],
  ['publickey'],
  ['pub', 'key'],
  ['pubkey'],
  ['pubkeys'],
  ['internal', 'key'],
  ['private', 'key'],
  ['private', 'keys'],
  ['privatekey'],
  ['secret', 'key'],
  ['secretkey'],
  ['secret'],
  ['wif'],
  ['mnemonic'],
  ['seed'],
  ['phrase'],
  ['password'],
  ['passphrase'],
  ['fingerprint'],
  ['fingerprints'],
  ['key', 'origin'],
  ['key', 'origins'],
  ['keyorigin'],
  ['keyorigins'],
  ['keychain', 'id'],
  ['keychain', 'ids'],
];

const fingerprintContextPattern = /fingerprint|key\s?origin|descriptor|policy/i;

const fingerprintPattern = /\b[0-9a-f]{8}\b/gi;

const mnemonicCandidatePattern = /\b[a-z]+(?:[\s,]+[a-z]+){11,}\b/gi;

const wordPattern = /[a-z]+/gi;

const legacyAddressPattern = /\b[123mn][1-9A-HJ-NP-Za-km-z]{25,34}\b/g;

const valuePatterns = [
  /\bcHNidP8[A-Za-z0-9+/]*={0,2}/g,
  /\b[tuvxyzUVYZ](?:pub|prv)[1-9A-HJ-NP-Za-km-z]{100,}\b/g,
  /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-z]{8,87}\b/gi,
  /\bS[MNPT][0-9A-HJKMNP-TV-Z]{37,40}\b/g,
  /\b(?:0x)?[0-9a-f]{40,}\b/gi,
  /\b[59cKL][1-9A-HJ-NP-Za-km-z]{50,51}\b/g,
  /\b[0-9a-f]{8}(?=\/\d)/gi,
];

function splitKeyWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

function isSensitiveKey(key: string) {
  const words = splitKeyWords(key);
  return sensitiveKeyTerms.some(
    term =>
      term.length <= words.length &&
      term.every((word, index) => words[words.length - term.length + index] === word)
  );
}

function redactMnemonicCandidate(candidate: string) {
  const words = Array.from(candidate.matchAll(wordPattern), match => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    isBip39Word: bip39Words.has(match[0].toLowerCase()),
  }));

  const ranges: { start: number; end: number }[] = [];
  let runStart = 0;
  words.forEach((word, index) => {
    if (!word.isBip39Word) {
      runStart = index + 1;
      return;
    }
    const isRunEnd = index === words.length - 1 || !words[index + 1]?.isBip39Word;
    const runLength = index - runStart + 1;
    if (isRunEnd && runLength >= minimumMnemonicWordCount) {
      ranges.push({ start: words[runStart]?.start ?? 0, end: word.end });
    }
  });

  return ranges.reduceRight(
    (result, range) => result.slice(0, range.start) + redacted + result.slice(range.end),
    candidate
  );
}

function redactString(value: string) {
  const withoutMnemonics = value.replace(mnemonicCandidatePattern, redactMnemonicCandidate);

  const withoutPatterns = valuePatterns.reduce(
    (result, pattern) => result.replace(pattern, redacted),
    withoutMnemonics
  );

  const withoutLegacyAddresses = withoutPatterns.replace(legacyAddressPattern, match =>
    /\d/.test(match) ? redacted : match
  );

  return fingerprintContextPattern.test(withoutLegacyAddresses)
    ? withoutLegacyAddresses.replace(fingerprintPattern, redacted)
    : withoutLegacyAddresses;
}

function safely(fn: () => unknown) {
  try {
    return fn();
  } catch {
    return redacted;
  }
}

function redactSensitiveValue(value: unknown) {
  if (value === null || value === undefined || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  return redacted;
}

function redactEntries(entries: [key: string, read: () => unknown][], ancestors: WeakSet<object>) {
  return Object.fromEntries(
    entries.map(([key, read]) => [
      key,
      safely(() =>
        isSensitiveKey(key) ? redactSensitiveValue(read()) : redactValue(read(), ancestors)
      ),
    ])
  );
}

function readOwnEntries(value: object): [key: string, read: () => unknown][] {
  return Object.keys(value).map(key => [key, (): unknown => Reflect.get(value, key)]);
}

function readRedactedString(read: () => unknown) {
  try {
    const value = read();
    return typeof value === 'string' ? redactString(value) : redacted;
  } catch {
    return redacted;
  }
}

function redactError(error: Error, ancestors: WeakSet<object>) {
  const copy = new Error(readRedactedString(() => error.message));
  copy.name = readRedactedString(() => error.name);
  copy.stack = readRedactedString(() => error.stack);
  Object.assign(copy, redactEntries(readOwnEntries(error), ancestors));
  if ('cause' in error) {
    Object.assign(copy, {
      cause: safely(() => redactValue(Reflect.get(error, 'cause'), ancestors)),
    });
  }
  return copy;
}

function redactObject(value: object, ancestors: WeakSet<object>): unknown {
  if (value instanceof Error) return redactError(value, ancestors);
  if (Array.isArray(value)) return value.map(item => safely(() => redactValue(item, ancestors)));
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redacted;
  if (value instanceof Map) {
    return redactEntries(
      Array.from(value, ([key, item]) => [String(key), (): unknown => item]),
      ancestors
    );
  }
  if (value instanceof Set) {
    return Array.from(value, item => safely(() => redactValue(item, ancestors)));
  }
  const toJSON: unknown = Reflect.get(value, 'toJSON');
  if (typeof toJSON === 'function') return redactValue(toJSON.call(value), ancestors);
  return redactEntries(readOwnEntries(value), ancestors);
}

function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (ancestors.has(value)) return circular;
  ancestors.add(value);
  try {
    return redactObject(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

export function redactLogArgs([msg, ...args]: [msg: unknown, ...args: unknown[]]): [
  msg: string,
  ...args: unknown[],
] {
  return [
    readRedactedString(() => msg),
    ...args.map(arg => safely(() => redactValue(arg, new WeakSet()))),
  ];
}
