import { describe, expect, test } from 'vitest';

import { redactLogArgs } from './logger-redaction';

const redacted = '[redacted]';

const nativeSegwitAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const legacyAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const xpub =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const descriptor = `wpkh([73c5da0a/84'/0'/0']${xpub}/0/*)`;
const psbtHex =
  '70736274ff01009a020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff';
const psbtBase64 = 'cHNidP8BAJoCAAAAAljoeiG1ba8MI76OcHBFbDNvfLqlyHV5JPVFiHuyq911AAAAAAD/////';
const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const uncompressedWif = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
const compressedWif = 'KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617';

function redactPayload(payload: unknown) {
  const [, redactedPayload] = redactLogArgs(['message', payload]);
  return redactedPayload;
}

function serialise(value: unknown) {
  return JSON.stringify(value);
}

describe(redactLogArgs.name, () => {
  test('redacts nested addresses, txids, PSBT hex, xpubs and descriptors', () => {
    const result = serialise(
      redactPayload({
        wallet: {
          account: { changeAddress: nativeSegwitAddress, policy: descriptor },
          history: [{ txid, rawTx: psbtHex }],
          note: `sent from ${taprootAddress} and ${legacyAddress} to ${stacksAddress}`,
          signed: `psbt ${psbtBase64}`,
          extendedKey: xpub,
          publicKey,
        },
      })
    );

    for (const sensitive of [
      nativeSegwitAddress,
      taprootAddress,
      legacyAddress,
      stacksAddress,
      txid,
      psbtHex,
      psbtBase64,
      xpub,
      descriptor,
      publicKey,
      '73c5da0a',
    ])
      expect(result).not.toContain(sensitive);
  });

  test('redacts sensitive values found inside free text and the message', () => {
    const [msg, detail] = redactLogArgs([
      `Broadcast ${txid} from ${nativeSegwitAddress}`,
      `outpoint ${txid}:1`,
    ]);

    expect(msg).toBe(`Broadcast ${redacted} from ${redacted}`);
    expect(detail).toBe(`outpoint ${redacted}:1`);
  });

  test('redacts an Error carrying axios-style request data', () => {
    const error = Object.assign(new Error(`Request failed for ${nativeSegwitAddress}`), {
      config: { url: '/v1/broadcast', data: JSON.stringify({ hex: psbtHex }) },
      response: { status: 400, data: { address: nativeSegwitAddress } },
    });

    const result = redactPayload(error);
    const serialised = serialise(result);

    expect(result).toMatchObject({
      name: 'Error',
      message: `Request failed for ${redacted}`,
      config: { url: '/v1/broadcast', data: redacted },
      response: { status: 400, data: redacted },
    });
    expect(serialised).not.toContain(nativeSegwitAddress);
    expect(serialised).not.toContain(psbtHex);
  });

  test('keeps and redacts the cause of an Error', () => {
    const error = new Error('Signing failed', {
      cause: new Error(`Unknown input ${txid}`),
    });

    expect(redactPayload(error)).toMatchObject({
      message: 'Signing failed',
      cause: { message: `Unknown input ${redacted}` },
    });
  });

  test('redacts mnemonic-shaped values regardless of case and separator', () => {
    const commaSeparated = mnemonic.split(' ').join(', ');
    const upperCase = mnemonic.toUpperCase();

    expect(redactPayload({ note: mnemonic })).toEqual({ note: redacted });
    expect(redactPayload({ note: `words: ${commaSeparated}` })).toEqual({
      note: `words: ${redacted}`,
    });
    expect(redactPayload({ note: upperCase })).toEqual({ note: redacted });
    expect(redactPayload({ mnemonic: 'anything' })).toEqual({ mnemonic: redacted });
  });

  test('redacts private-key-shaped values and secret keys', () => {
    expect(
      redactPayload({
        note: `${uncompressedWif} ${compressedWif}`,
        privateKey: 'abc',
        secretKey: 'abc',
        password: 'hunter2',
      })
    ).toEqual({
      note: `${redacted} ${redacted}`,
      privateKey: redacted,
      secretKey: redacted,
      password: redacted,
    });
  });

  test('redacts fingerprints, key origins and keychain ids', () => {
    expect(
      redactPayload({
        fingerprint: '73c5da0a',
        keyOrigin: "73c5da0a/84'/0'/0'",
        keyOrigins: ["73c5da0a/84'/0'/0'"],
        keychainId: 'default',
        keychainIds: ['default'],
        path: "73c5da0a/86'/0'/0'",
      })
    ).toEqual({
      fingerprint: redacted,
      keyOrigin: redacted,
      keyOrigins: '[1 items]',
      keychainId: redacted,
      keychainIds: '[1 items]',
      path: redacted,
    });

    const [msg] = redactLogArgs(['Successfully migrated Ledger fingerprint: 00000000 → 73c5da0a']);
    expect(msg).toBe(`Successfully migrated Ledger fingerprint: ${redacted} → ${redacted}`);
  });

  test('collapses UTXO and outpoint arrays to a count', () => {
    const utxo = { address: nativeSegwitAddress, txid, vout: 0, value: 1000 };

    expect(
      redactPayload({
        inputs: [utxo, utxo],
        outputs: [{ address: nativeSegwitAddress, value: 500 }],
        utxos: [utxo],
        outpoints: [`${txid}:0`],
        fee: 250,
      })
    ).toEqual({
      inputs: '[2 items]',
      outputs: '[1 items]',
      utxos: '[1 items]',
      outpoints: '[1 items]',
      fee: 250,
    });
  });

  test('does not mutate the caller object', () => {
    const payload = {
      inputs: [{ address: nativeSegwitAddress, txid }],
      nested: { address: nativeSegwitAddress },
      error: new Error(txid),
    };
    const snapshot = structuredClone(payload);

    redactPayload(payload);

    expect(payload).toEqual(snapshot);
    expect(payload.error.message).toBe(txid);
  });

  test('keeps fee, counts, method and other non-identifying fields readable', () => {
    const payload = {
      method: 'signPsbt',
      id: 'req-1',
      fee: 1200,
      inputCount: 3,
      outputCount: 2,
      totalInputValue: 150000,
      addressIndex: 4,
      addressCount: 20,
      addressType: 'p2wpkh',
      isAddressType: true,
      description: 'Swap tokens',
      subscription: 'monthly',
      transcript: 'hello',
      hexColor: '#ff00aa',
      ctx: 'popup',
      status: 'networkConfigurationMismatchErr',
      reason: 'The user rejected the request because the network fee was too high for them',
    };

    expect(redactPayload(payload)).toEqual(payload);
  });

  test('never throws', () => {
    const throwingGetter = {
      get address() {
        throw new Error('boom');
      },
      get label() {
        throw new Error('boom');
      },
      fee: 10,
    };
    const circular: Record<string, unknown> = { fee: 1 };
    circular.self = circular;

    expect(redactLogArgs([{ msg: nativeSegwitAddress }, throwingGetter, circular])).toEqual([
      redacted,
      { address: redacted, label: redacted, fee: 10 },
      { fee: 1, self: '[circular]' },
    ]);
  });
});
