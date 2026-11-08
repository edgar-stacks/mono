import { isObjectType } from 'remeda';
import { describe, expect, test } from 'vitest';

import {
  isSensitiveKey,
  redactLogArgs,
  redactString,
  redactedPlaceholder,
} from './logger-redaction';

const nativeSegwitAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const legacyAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const psbtHex =
  '70736274ff01009a020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff';
const psbtBase64 = 'cHNidP8BAJoCAAAAAljoeiG1ba8MI76OcHBFbDNvfLqlyHV5JPVFiHuyq911AAAAAAD/////';
const xpub =
  'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';
const fingerprint = 'a1b2c3d4';
const descriptor = `wpkh([${fingerprint}/84'/0'/0']${xpub}/0/*)`;
const compressedWif = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const uncompressedWif = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function redactOne(value: unknown) {
  const [redacted] = redactLogArgs([value]);
  return redacted;
}

function getProperty(value: unknown, key: string): unknown {
  return isObjectType(value) ? Reflect.get(value, key) : undefined;
}

function serialize(value: unknown) {
  return JSON.stringify(redactLogArgs([value]));
}

describe(redactLogArgs.name, () => {
  test('redacts nested addresses, txids, PSBT hex, xpubs and descriptors', () => {
    const output = serialize({
      request: {
        params: {
          hex: psbtHex,
          note: `pay ${nativeSegwitAddress} and ${taprootAddress} from ${txid}:0`,
          nested: { deep: [legacyAddress, stacksAddress, psbtBase64] },
        },
      },
      account: { stacksDescriptor: descriptor, policy: descriptor, extendedKey: xpub },
    });

    for (const sensitive of [
      nativeSegwitAddress,
      taprootAddress,
      legacyAddress,
      stacksAddress,
      txid,
      psbtHex,
      psbtBase64,
      xpub,
      fingerprint,
    ])
      expect(output).not.toContain(sensitive);
  });

  test('redacts an error carrying request config data', () => {
    const error = Object.assign(new Error(`Request failed for ${nativeSegwitAddress}`), {
      config: { url: 'https://api.example/tx', data: JSON.stringify({ tx: psbtHex }) },
      response: { status: 400, data: { message: `bad input ${txid}` } },
    });

    const redacted = redactOne(error);

    expect(redacted).toBeInstanceOf(Error);
    const output = JSON.stringify({
      redacted,
      message: getProperty(redacted, 'message'),
      stack: getProperty(redacted, 'stack'),
    });
    expect(output).not.toContain(nativeSegwitAddress);
    expect(output).not.toContain(psbtHex);
    expect(output).not.toContain(txid);
    expect(output).toContain('Request failed for');
    expect(output).toContain('"status":400');
  });

  test('keeps and redacts an error cause', () => {
    const error = new Error('Outer failure', { cause: new Error(`Inner ${txid}`) });

    const cause: unknown = getProperty(redactOne(error), 'cause');

    expect(cause).toBeInstanceOf(Error);
    expect(getProperty(cause, 'message')).toBe(`Inner ${redactedPlaceholder}`);
  });

  test('redacts mnemonic-shaped values regardless of case and separator', () => {
    const variants = [
      mnemonic,
      mnemonic.toUpperCase(),
      mnemonic.split(' ').join(','),
      mnemonic.split(' ').join(', '),
      mnemonic.split(' ').join('\n'),
    ];

    for (const variant of variants)
      expect(redactOne(`restored from ${variant} for the user`)).toBe(
        `restored from ${redactedPlaceholder} for the user`
      );
  });

  test('redacts private-key-shaped values', () => {
    expect(redactOne(`imported ${compressedWif}`)).toBe(`imported ${redactedPlaceholder}`);
    expect(redactOne(`imported ${uncompressedWif}`)).toBe(`imported ${redactedPlaceholder}`);
    expect(
      redactOne({ privateKey: 'anything', secretKey: 'anything', password: 'hunter2' })
    ).toEqual({
      privateKey: redactedPlaceholder,
      secretKey: redactedPlaceholder,
      password: redactedPlaceholder,
    });
  });

  test('redacts fingerprints by key, by key origin and in messages', () => {
    expect(redactOne({ fingerprint, keyOrigin: 'anything' })).toEqual({
      fingerprint: redactedPlaceholder,
      keyOrigin: redactedPlaceholder,
    });
    expect(redactOne(`${fingerprint}/84'/0'/0'`)).toBe(`${redactedPlaceholder}/84'/0'/0'`);
    expect(redactOne(`${fingerprint}/5757h/0h/0h/0/0`)).toBe(
      `${redactedPlaceholder}/5757h/0h/0h/0/0`
    );
    expect(redactOne(`Migrated Ledger fingerprint: 00000000 → ${fingerprint}`)).toBe(
      `Migrated Ledger fingerprint: ${redactedPlaceholder} → ${redactedPlaceholder}`
    );
    expect(redactOne({ keychainId: 'id', keychainIds: ['id'], keyOrigins: ['origin'] })).toEqual({
      keychainId: redactedPlaceholder,
      keychainIds: '[1 items redacted]',
      keyOrigins: '[1 items redacted]',
    });
  });

  test('collapses UTXO arrays to a count', () => {
    const utxo = { txid, vout: 0, value: 10_000, address: nativeSegwitAddress };

    expect(redactOne({ inputs: [utxo, utxo], utxos: [utxo], outpoints: [`${txid}:0`] })).toEqual({
      inputs: '[2 items redacted]',
      utxos: '[1 items redacted]',
      outpoints: '[1 items redacted]',
    });
  });

  test('does not mutate the input', () => {
    const input = {
      inputs: [{ txid, vout: 0, address: nativeSegwitAddress }],
      nested: { address: nativeSegwitAddress, note: `to ${nativeSegwitAddress}` },
    };
    const snapshot = structuredClone(input);

    redactLogArgs(['Coin selection', input]);

    expect(input).toEqual(snapshot);
  });

  test('keeps fee, counts and method readable', () => {
    expect(
      redactOne({
        method: 'signPsbt',
        id: 'req-1',
        fee: '1420',
        inputCount: 2,
        outputCount: 2,
        totalInputValue: '20000',
        level: 'info',
      })
    ).toEqual({
      method: 'signPsbt',
      id: 'req-1',
      fee: '1420',
      inputCount: 2,
      outputCount: 2,
      totalInputValue: '20000',
      level: 'info',
    });
  });

  test('keeps camelCase keys that only contain a sensitive word as a substring', () => {
    const value = {
      description: 'A token',
      subscription: 'monthly',
      transcript: 'hello',
      hexColor: '#ffffff',
      ctx: 'popup',
      addressIndex: 3,
      addressType: 'p2wpkh',
      addressCount: 5,
      isAddressValid: true,
    };

    expect(redactOne(value)).toEqual(value);
  });

  test('keeps ordinary sentences and identifiers readable', () => {
    const sentences = [
      'Beginning multi-wallet support migration',
      'Ledger fingerprint migration required, requesting fingerprint from device',
      'networkConfigurationMismatchErr',
      'The quick brown fox jumps over the lazy dog while the user waits for the network to respond',
      'Unable to broadcast transaction because the fee is too low for the current mempool',
    ];

    for (const sentence of sentences) expect(redactOne(sentence)).toBe(sentence);
  });

  test('never throws', () => {
    const throwingGetter = Object.defineProperty({ fee: 1 }, 'details', {
      enumerable: true,
      get() {
        throw new Error('boom');
      },
    });
    const circular: Record<string, unknown> = { method: 'open' };
    circular.self = circular;

    expect(redactOne(throwingGetter)).toEqual({ fee: 1, details: redactedPlaceholder });
    expect(redactOne(circular)).toEqual({ method: 'open', self: '[circular]' });
    expect(redactLogArgs([42, null, undefined, true])).toEqual([42, null, undefined, true]);
  });
});

describe(redactString.name, () => {
  test('requires a digit in a legacy address candidate', () => {
    expect(redactString('mabcdefghijkmnopqrstuvwxyzABC')).toBe('mabcdefghijkmnopqrstuvwxyzABC');
    expect(redactString(legacyAddress)).toBe(redactedPlaceholder);
  });
});

describe(isSensitiveKey.name, () => {
  test('matches whole camelCase words', () => {
    for (const key of ['address', 'changeAddress', 'txId', 'txid', 'psbtHex', 'publicKey'])
      expect(isSensitiveKey(key)).toBe(true);
    for (const key of ['description', 'subscription', 'transcript', 'hexColor', 'ctx'])
      expect(isSensitiveKey(key)).toBe(false);
  });
});
