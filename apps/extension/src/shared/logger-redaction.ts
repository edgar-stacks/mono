import { wordlist } from '@scure/bip39/wordlists/english';
import BigNumber from 'bignumber.js';
import { keys } from 'remeda';

const redactedPlaceholder = '[redacted]';
const circularPlaceholder = '[circular]';
const minimumMnemonicWordCount = 12;

const sensitiveKeyTerms = new Set(
  [
    'address',
    'txid',
    'tx',
    'hex',
    'psbt',
    'descriptor',
    'policy',
    'xpub',
    'xprv',
    'pubkey',
    'publickey',
    'fingerprint',
    'keyorigin',
    'keychainid',
    'mnemonic',
    'phrase',
    'privatekey',
    'secretkey',
    'secret',
    'wif',
    'password',
    'seed',
    'utxo',
    'outpoint',
    'script',
    'signature',
    'input',
    'output',
  ].flatMap(term => [term, `${term}s`, `${term}es`, term.replace(/y$/, 'ies')])
);

const bip39Words = new Set(wordlist);

const base58Character = '[1-9A-HJ-NP-Za-km-z]';
const base58WithDigit = `(?=${base58Character}*[1-9])`;

const psbtPattern = /\bcHNidP8[A-Za-z0-9+/]+={0,2}/g;
const extendedKeyPattern = new RegExp(
  `\\b[xyztuvYZUV](pub|prv)${base58WithDigit}${base58Character}{100,108}\\b`,
  'g'
);
const wifPattern = new RegExp(
  `\\b[5KLc9]${base58WithDigit}(?=${base58Character}*[A-Z])(?=${base58Character}*[a-z])${base58Character}{50,51}\\b`,
  'g'
);
const bech32AddressPattern = /\b(?:bc|tb|bcrt)1[ac-hj-np-z02-9]{8,87}\b/gi;
const stacksAddressPattern = /\bS[MNPT](?=[0-9A-HJKMNP-TV-Z]*[0-9])[0-9A-HJKMNP-TV-Z]{33,41}\b/g;
const legacyAddressPattern = new RegExp(
  `\\b[123mn]${base58WithDigit}(?=${base58Character}*[A-Z])(?=${base58Character}*[a-z])${base58Character}{25,34}\\b`,
  'g'
);
const keyOriginFingerprintPattern = /\b[0-9a-fA-F]{8}(?=(?:\/\d+['hH]?)+)/g;
const fingerprintWordPattern = /fingerprint/i;
const standaloneFingerprintPattern = /\b[0-9a-fA-F]{8}\b/g;
const hexPattern = /\b(?:0x)?[0-9a-fA-F]{32,}\b/g;
const txidLength = 64;
const wordPattern = /[A-Za-z]+/g;
const mnemonicSeparatorPattern = /^[\s,]+$/;

function redactMnemonics(text: string) {
  const words = Array.from(text.matchAll(wordPattern), match => ({
    start: match.index,
    end: match.index + match[0].length,
    isBip39Word: bip39Words.has(match[0].toLowerCase()),
  }));

  const spans: { start: number; end: number }[] = [];
  let runStart = 0;

  for (let index = 0; index <= words.length; index++) {
    const word = words[index];
    const previousWord = words[index - 1];
    const continuesRun =
      word?.isBip39Word &&
      previousWord?.isBip39Word &&
      mnemonicSeparatorPattern.test(text.slice(previousWord.end, word.start));

    if (continuesRun) continue;

    const runLength = index - runStart;
    const firstWord = words[runStart];
    if (previousWord && firstWord?.isBip39Word && runLength >= minimumMnemonicWordCount) {
      spans.push({ start: firstWord.start, end: previousWord.end });
    }
    runStart = index;
  }

  return spans.reduceRight(
    (redacted, { start, end }) => redacted.slice(0, start) + '[mnemonic]' + redacted.slice(end),
    text
  );
}

function redactHex(match: string) {
  return match.replace(/^0x/, '').length === txidLength ? '[txid]' : '[hex]';
}

function redactString(text: string) {
  const redacted = redactMnemonics(text)
    .replace(psbtPattern, '[psbt]')
    .replace(extendedKeyPattern, (_match, kind: string) => `[x${kind}]`)
    .replace(wifPattern, '[wif]')
    .replace(bech32AddressPattern, '[address]')
    .replace(stacksAddressPattern, '[address]')
    .replace(legacyAddressPattern, '[address]')
    .replace(keyOriginFingerprintPattern, redactedPlaceholder)
    .replace(hexPattern, redactHex);

  if (!fingerprintWordPattern.test(redacted)) return redacted;
  return redacted.replace(standaloneFingerprintPattern, redactedPlaceholder);
}

function splitKeyWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isSensitiveKey(key: string) {
  const words = splitKeyWords(key);
  const lastWord = words.at(-1);
  const lastTwoWords = words.slice(-2).join('');
  return (
    (lastWord !== undefined && sensitiveKeyTerms.has(lastWord)) ||
    sensitiveKeyTerms.has(lastTwoWords)
  );
}

function redactSensitiveValue(value: unknown) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  return redactedPlaceholder;
}

function redactError(error: Error, ancestors: Set<object>) {
  const redacted: Record<string, unknown> = {
    name: redactValue(error.name, ancestors),
    message: redactValue(error.message, ancestors),
    stack: redactValue(error.stack, ancestors),
  };
  if ('cause' in error) redacted.cause = redactValue(error.cause, ancestors);
  return { ...redacted, ...redactProperties(error, ancestors) };
}

function redactProperties(value: object, ancestors: Set<object>) {
  const redacted: Record<string, unknown> = {};
  for (const key of keys(value)) {
    const property: unknown = Reflect.get(value, key);
    redacted[key] = isSensitiveKey(key)
      ? redactSensitiveValue(property)
      : redactValue(property, ancestors);
  }
  return redacted;
}

function redactObject(value: object, ancestors: Set<object>): unknown {
  if (value instanceof Date) return value.toISOString();
  if (BigNumber.isBigNumber(value)) return value.toString();
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redactedPlaceholder;
  if (ancestors.has(value)) return circularPlaceholder;

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => redactValue(item, ancestors));
    if (value instanceof Error) return redactError(value, ancestors);
    return redactProperties(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function redactValue(value: unknown, ancestors: Set<object>): unknown {
  try {
    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'object' && value !== null) return redactObject(value, ancestors);
    return value;
  } catch {
    return redactedPlaceholder;
  }
}

export function redactLogMessage(message: unknown) {
  if (typeof message === 'string') return redactString(message);
  try {
    const serialized: unknown = JSON.stringify(redactValue(message, new Set()));
    return typeof serialized === 'string' ? serialized : redactedPlaceholder;
  } catch {
    return redactedPlaceholder;
  }
}

export function redactLogArgs(args: unknown[]) {
  return args.map(arg => redactValue(arg, new Set()));
}
