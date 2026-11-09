import { wordlist } from '@scure/bip39/wordlists/english';

import { isString } from '@leather.io/utils';

const redactedPlaceholder = '[redacted]';
const circularPlaceholder = '[circular]';

const minimumMnemonicWordCount = 12;

const sensitiveKeyFragments = [
  'address',
  'txid',
  'outpoint',
  'psbt',
  'hex',
  'rawtx',
  'xpub',
  'xprv',
  'descriptor',
  'publickey',
  'pubkey',
  'privatekey',
  'secret',
  'mnemonic',
  'seed',
  'password',
  'passphrase',
];

const bip39Word = `(?:${wordlist.join('|')})`;

const sensitiveTextPatterns = [
  new RegExp(`\\b${bip39Word}\\b(?:\\s+${bip39Word}\\b){${minimumMnemonicWordCount - 1},}`, 'gi'),
  /\b[tuvxyzTUVXYZ](?:pub|prv)[1-9A-HJ-NP-Za-km-z]{100,}\b/g,
  /cHNidP8[A-Za-z0-9+/]*={0,2}/g,
  /\b(?:0x)?[0-9a-fA-F]{40,}\b/g,
  /\b(?:bc|tb|bcrt)1[02-9ac-hj-np-z]{6,87}\b/gi,
  /\b[123mn][1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
  /\bS[PMTN][0-9A-HJKMNP-TV-Z]{38,40}\b(?!\.)/g,
];

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sensitiveKeyFragments.some(fragment => normalizedKey.includes(fragment));
}

function isCountOrFlag(value: unknown) {
  return typeof value === 'number' || typeof value === 'boolean' || value === null;
}

function redactSensitiveText(text: string) {
  return sensitiveTextPatterns.reduce(
    (redactedText, pattern) => redactedText.replace(pattern, redactedPlaceholder),
    text
  );
}

function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (isString(value)) return redactSensitiveText(value);
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return redactedPlaceholder;
  if (typeof value !== 'object' || value === null) return value;
  if (ancestors.has(value)) return circularPlaceholder;

  ancestors.add(value);
  const redacted = Array.isArray(value)
    ? value.map((item: unknown) => redactValue(item, ancestors))
    : Object.fromEntries(
        Object.entries(value).map(([key, nested]: [string, unknown]) => [
          key,
          isSensitiveKey(key) && !isCountOrFlag(nested)
            ? redactedPlaceholder
            : redactValue(nested, ancestors),
        ])
      );
  ancestors.delete(value);
  return redacted;
}

export function redactLogMessages(messages: unknown[]) {
  return messages.map(message => redactValue(message, new WeakSet()));
}
