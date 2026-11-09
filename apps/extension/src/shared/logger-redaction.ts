import { wordlist } from '@scure/bip39/wordlists/english';
import BigNumber from 'bignumber.js';

import { isDefined } from '@leather.io/utils';

const redacted = '[redacted]';
const circular = '[circular]';

const minimumMnemonicWordCount = 12;

const bip39Words = new Set(wordlist);

const sensitiveKeyTerms = [
  ['address'],
  ['addresses'],
  ['txid'],
  ['txids'],
  ['tx'],
  ['tx', 'id'],
  ['tx', 'ids'],
  ['txs'],
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
  ['pub', 'key'],
  ['pub', 'keys'],
  ['public', 'key'],
  ['public', 'keys'],
  ['fingerprint'],
  ['fingerprints'],
  ['key', 'origin'],
  ['key', 'origins'],
  ['keychain', 'id'],
  ['keychain', 'ids'],
  ['mnemonic'],
  ['mnemonics'],
  ['phrase'],
  ['phrases'],
  ['private', 'key'],
  ['private', 'keys'],
  ['wif'],
  ['wifs'],
  ['password'],
  ['passwords'],
  ['seed'],
  ['seeds'],
  ['utxo'],
  ['utxos'],
  ['outpoint'],
  ['outpoints'],
  ['script'],
  ['scripts'],
  ['signature'],
  ['signatures'],
  ['inputs'],
  ['outputs'],
];

const base58Chars = '1-9A-HJ-NP-Za-km-z';

const psbtBase64Pattern = /cHNidP8[A-Za-z0-9+/]*={0,2}/g;
const psbtHexPattern = /70736274ff[0-9a-f]*/gi;
const extendedKeyPattern = new RegExp(`\\b[a-zA-Z]p(?:ub|rv)[${base58Chars}]{100,}\\b`, 'g');
const wifPattern = new RegExp(`\\b[5KLc9][${base58Chars}]{50,51}\\b`, 'g');
const outpointPattern = /\b[0-9a-fA-F]{64}:\d+\b/g;
const hexRunPattern = /\b(?:0x)?[0-9a-fA-F]{32,}\b/g;
const bech32AddressPattern = /\b(?:bc|tb|bcrt)1[ac-hj-np-z02-9]{6,87}\b/gi;
const stacksAddressPattern = /\bS[MNPT][0-9A-HJKMNP-TV-Z]{37,40}\b/g;
const legacyAddressPattern = new RegExp(`\\b[123mn][${base58Chars}]{25,34}\\b`, 'g');
const keyOriginFingerprintPattern = /\b[0-9a-fA-F]{8}(?=(?:\/\d+['hH]?)+)/g;
const fingerprintWordPattern = /fingerprint/i;
const standaloneFingerprintPattern = /\b[0-9a-fA-F]{8}\b/g;
const wordPattern = /[A-Za-z]+/g;
const mnemonicSeparatorPattern = /^[\s,]+$/;

function splitKeyIntoWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
}

function isSensitiveKey(key: string) {
  const words = splitKeyIntoWords(key);
  return sensitiveKeyTerms.some(term => {
    if (term.length > words.length) return false;
    const trailingWords = words.slice(words.length - term.length);
    return term.every((termWord, index) => trailingWords[index] === termWord);
  });
}

function looksLikeBase58Identifier(value: string) {
  return /\d/.test(value) && /[a-z]/.test(value) && /[A-Z]/.test(value);
}

function redactBase58Match(match: string) {
  return looksLikeBase58Identifier(match) ? redacted : match;
}

function redactFingerprintsAfterWord(value: string) {
  const wordMatch = fingerprintWordPattern.exec(value);
  if (!wordMatch) return value;
  const splitIndex = wordMatch.index + wordMatch[0].length;
  return (
    value.slice(0, splitIndex) +
    value.slice(splitIndex).replace(standaloneFingerprintPattern, redacted)
  );
}

interface WordSpan {
  start: number;
  end: number;
}

function redactMnemonics(value: string) {
  const runs: WordSpan[][] = [];
  let currentRun: WordSpan[] = [];

  for (const match of value.matchAll(wordPattern)) {
    const word = { start: match.index, end: match.index + match[0].length };
    const previous = currentRun.at(-1);
    const isBip39Word = bip39Words.has(match[0].toLowerCase());
    const continuesRun =
      isBip39Word &&
      isDefined(previous) &&
      mnemonicSeparatorPattern.test(value.slice(previous.end, word.start));

    if (continuesRun) {
      currentRun.push(word);
      continue;
    }
    runs.push(currentRun);
    currentRun = isBip39Word ? [word] : [];
  }
  runs.push(currentRun);

  return runs
    .filter(run => run.length >= minimumMnemonicWordCount)
    .reduceRight((result, run) => {
      const first = run[0];
      const last = run.at(-1);
      if (!first || !last) return result;
      return result.slice(0, first.start) + redacted + result.slice(last.end);
    }, value);
}

function redactString(value: string) {
  const withoutPatterns = value
    .replace(psbtBase64Pattern, redacted)
    .replace(psbtHexPattern, redacted)
    .replace(extendedKeyPattern, redacted)
    .replace(wifPattern, redactBase58Match)
    .replace(outpointPattern, redacted)
    .replace(hexRunPattern, redacted)
    .replace(bech32AddressPattern, redacted)
    .replace(stacksAddressPattern, redacted)
    .replace(legacyAddressPattern, redactBase58Match)
    .replace(keyOriginFingerprintPattern, redacted);
  return redactMnemonics(redactFingerprintsAfterWord(withoutPatterns));
}

function redactSensitiveValue(value: unknown) {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value === null || value === undefined) return value;
  return redacted;
}

function redactEntries(entries: [string, unknown][], ancestors: WeakSet<object>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    result[key] = isSensitiveKey(key) ? redactSensitiveValue(value) : redactValue(value, ancestors);
  }
  return result;
}

function readOwnEntries(value: object): [string, unknown][] {
  return Object.keys(value).map(key => [key, Reflect.get(value, key)]);
}

function redactError(error: Error, ancestors: WeakSet<object>) {
  return redactEntries(
    [
      ['name', error.name],
      ['message', error.message],
      ['stack', error.stack],
      ['cause', error.cause],
      ...readOwnEntries(error).filter(
        ([key]) => !['name', 'message', 'stack', 'cause'].includes(key)
      ),
    ],
    ancestors
  );
}

function redactObject(value: object, ancestors: WeakSet<object>): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  if (BigNumber.isBigNumber(value)) return value.toString();
  if (Array.isArray(value)) return value.map(item => redactValue(item, ancestors));
  if (value instanceof Set) return Array.from(value, item => redactValue(item, ancestors));
  if (value instanceof Map) {
    return redactEntries(
      Array.from(value.entries(), ([key, item]) => [String(key), item]),
      ancestors
    );
  }
  if (value instanceof Error) return redactError(value, ancestors);
  return redactEntries(readOwnEntries(value), ancestors);
}

function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  try {
    if (typeof value === 'string') return redactString(value);
    if (typeof value === 'bigint') return value.toString();
    if (typeof value !== 'object' || value === null) return value;
    if (ancestors.has(value)) return circular;

    ancestors.add(value);
    try {
      return redactObject(value, ancestors);
    } finally {
      ancestors.delete(value);
    }
  } catch {
    return redacted;
  }
}

export function redactLogMessage(message: unknown): string {
  const redactedMessage = redactValue(message, new WeakSet());
  if (typeof redactedMessage === 'string') return redactedMessage;
  try {
    return JSON.stringify(redactedMessage) ?? redacted;
  } catch {
    return redacted;
  }
}

export function redactLogArgs(args: unknown[]): unknown[] {
  return args.map(arg => redactValue(arg, new WeakSet()));
}
