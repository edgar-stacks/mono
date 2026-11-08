import { wordlist } from '@scure/bip39/wordlists/english';
import { isArray, isFunction, isObjectType, isPlainObject, isString } from 'remeda';

export const redactedPlaceholder = '[redacted]';

const circularPlaceholder = '[circular]';

const minimumMnemonicWordCount = 12;

const bip39Words = new Set(wordlist);

const sensitiveTrailingPhrases = [
  ['address'],
  ['addresses'],
  ['txid'],
  ['txids'],
  ['tx'],
  ['txs'],
  ['tx', 'id'],
  ['tx', 'ids'],
  ['hex'],
  ['psbt'],
  ['psbts'],
  ['descriptor'],
  ['descriptors'],
  ['policy'],
  ['policies'],
  ['xpub'],
  ['xpubs'],
  ['pubkey'],
  ['pubkeys'],
  ['public', 'key'],
  ['public', 'keys'],
  ['private', 'key'],
  ['private', 'keys'],
  ['secret', 'key'],
  ['secret', 'keys'],
  ['fingerprint'],
  ['fingerprints'],
  ['keyorigin'],
  ['keyorigins'],
  ['key', 'origin'],
  ['key', 'origins'],
  ['keychain', 'id'],
  ['keychain', 'ids'],
  ['outpoint'],
  ['outpoints'],
  ['utxo'],
  ['utxos'],
  ['input'],
  ['inputs'],
  ['output'],
  ['outputs'],
  ['recipient'],
  ['recipients'],
  ['signature'],
  ['signatures'],
  ['script'],
  ['witness'],
  ['transaction'],
  ['transactions'],
  ['phrase'],
];

const sensitiveWordsAnywhere = new Set([
  'mnemonic',
  'password',
  'passphrase',
  'seed',
  'secret',
  'privkey',
  'wif',
  'xpub',
  'xprv',
]);

const base58Characters = '1-9A-HJ-NP-Za-km-z';

const psbtBase64Pattern = /cHNidP8[A-Za-z0-9+/]*={0,2}/g;
const extendedKeyPattern = new RegExp(
  `\\b[xyztuvYZUV](?:pub|prv)[${base58Characters}]{100,108}\\b`,
  'g'
);
const wifPattern = new RegExp(`\\b[5KLc][${base58Characters}]{50,51}\\b`, 'g');
const bech32AddressPattern = /\b(?:bc|tb|bcrt)1[a-z0-9]{25,87}\b/gi;
const legacyAddressPattern = new RegExp(`\\b[123mn][${base58Characters}]{25,34}\\b`, 'g');
const stacksAddressPattern = /\bS[MNPT][0-9A-HJKMNP-TV-Z]{28,41}\b/g;
const hexRunPattern = /\b(?:0x)?[0-9a-f]{16,}\b/gi;
const keyOriginFingerprintPattern = /\b[0-9a-f]{8}(?=\/\d)/gi;
const fingerprintMentionPattern = /fingerprint/i;
const standaloneFingerprintPattern = /\b[0-9a-f]{8}\b/gi;
const wordRunPattern = /[a-z]+(?:[\s,]+[a-z]+)+/gi;
const wordSeparatorPattern = /([\s,]+)/;
const digitPattern = /\d/;

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(word => word.toLowerCase());
}

function endsWithPhrase(words: string[], phrase: string[]) {
  if (phrase.length > words.length) return false;
  const tail = words.slice(words.length - phrase.length);
  return phrase.every((word, index) => tail[index] === word);
}

export function isSensitiveKey(key: string) {
  const words = splitKeyIntoWords(key);
  if (words.some(word => sensitiveWordsAnywhere.has(word))) return true;
  return sensitiveTrailingPhrases.some(phrase => endsWithPhrase(words, phrase));
}

function redactMnemonicRun(run: string) {
  const tokens = run.split(wordSeparatorPattern);
  const words = tokens.filter((_, index) => index % 2 === 0);
  if (words.length < minimumMnemonicWordCount) return run;

  const isRedacted = words.map(() => false);
  let segmentStart = 0;
  for (let index = 0; index <= words.length; index++) {
    const word = words[index];
    if (isString(word) && bip39Words.has(word.toLowerCase())) continue;
    if (index - segmentStart >= minimumMnemonicWordCount) {
      isRedacted.fill(true, segmentStart, index);
    }
    segmentStart = index + 1;
  }

  return words
    .map((word, index) => {
      const separatorBefore = index === 0 ? '' : (tokens[index * 2 - 1] ?? '');
      if (!isRedacted[index]) return separatorBefore + word;
      if (index > 0 && isRedacted[index - 1]) return null;
      return separatorBefore + redactedPlaceholder;
    })
    .filter(isString)
    .join('');
}

export function redactString(value: string) {
  const redacted = value
    .replace(psbtBase64Pattern, redactedPlaceholder)
    .replace(extendedKeyPattern, redactedPlaceholder)
    .replace(wifPattern, redactedPlaceholder)
    .replace(bech32AddressPattern, redactedPlaceholder)
    .replace(legacyAddressPattern, match =>
      digitPattern.test(match) ? redactedPlaceholder : match
    )
    .replace(stacksAddressPattern, redactedPlaceholder)
    .replace(hexRunPattern, redactedPlaceholder)
    .replace(keyOriginFingerprintPattern, redactedPlaceholder)
    .replace(wordRunPattern, redactMnemonicRun);

  if (!fingerprintMentionPattern.test(redacted)) return redacted;
  return redacted.replace(standaloneFingerprintPattern, redactedPlaceholder);
}

function redactSensitiveValue(value: unknown) {
  if (value === null || value === undefined) return value;
  if (isArray(value)) return `[${value.length} items redacted]`;
  return redactedPlaceholder;
}

function redactError(error: Error, ancestors: WeakSet<object>) {
  const copy = new Error(redactString(String(error.message)));
  copy.name = redactString(String(error.name));
  copy.stack = isString(error.stack) ? redactString(error.stack) : undefined;
  if ('cause' in error) copy.cause = redactValue(error.cause, ancestors);

  for (const key of Object.keys(error)) {
    if (key === 'cause') continue;
    Object.assign(copy, { [redactString(key)]: redactProperty(error, key, ancestors) });
  }
  return copy;
}

function redactObject(value: object, ancestors: WeakSet<object>) {
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    copy[redactString(key)] = redactProperty(value, key, ancestors);
  }
  return copy;
}

function redactProperty(source: object, key: string, ancestors: WeakSet<object>) {
  try {
    const value: unknown = Reflect.get(source, key);
    if (isSensitiveKey(key)) return redactSensitiveValue(value);
    return redactValue(value, ancestors);
  } catch {
    return redactedPlaceholder;
  }
}

function redactNonPlainObject(value: object, ancestors: WeakSet<object>) {
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redactedPlaceholder;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Error) return redactError(value, ancestors);
  const toJSON: unknown = Reflect.get(value, 'toJSON');
  if (isFunction(toJSON)) return redactValue(toJSON.call(value), ancestors);
  return redactObject(value, ancestors);
}

function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (isString(value)) return redactString(value);
  if (!isObjectType(value)) return value;
  if (isFunction(value)) return value;
  if (ancestors.has(value)) return circularPlaceholder;

  ancestors.add(value);
  try {
    if (isArray(value)) return value.map(item => redactValue(item, ancestors));
    if (isPlainObject(value)) return redactObject(value, ancestors);
    return redactNonPlainObject(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

export function redactLogArgs(args: readonly unknown[]): unknown[] {
  return args.map(arg => {
    try {
      return redactValue(arg, new WeakSet());
    } catch {
      return redactedPlaceholder;
    }
  });
}
