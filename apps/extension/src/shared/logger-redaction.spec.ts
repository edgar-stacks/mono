import { describe, expect, test } from 'vitest';

import { redactLogArgs } from './logger-redaction';

const nativeSegwitAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const testnetAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const psbtHex = '70736274ff01007d0200000001' + 'ab'.repeat(40);
const psbtBase64 = 'cHNidP8BAHECAAAAAQ' + 'A'.repeat(40) + '==';
const xpub =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const descriptor = `wpkh([0a1b2c3d/84'/0'/0']${xpub}/0/*)`;
const publicKey = '02' + 'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';
const mnemonic =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const wifPrivateKey = 'KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617';
const fingerprint = '0a1b2c3d';

function redactOne(value: unknown) {
  return redactLogArgs(['message', value])[1];
}

describe(redactLogArgs.name, () => {
  describe('coin selection', () => {
    const coinSelection = {
      inputs: [
        { address: nativeSegwitAddress, txid, vout: 0, value: 10_000 },
        { address: taprootAddress, txid, vout: 1, value: 20_000 },
      ],
      outputs: [{ address: legacyAddress, value: 15_000 }],
      fee: 500,
    };

    test('collapses UTXO and output arrays to counts', () => {
      expect(redactOne(coinSelection)).toEqual({
        inputs: '[redacted: 2 items]',
        outputs: '[redacted: 1 items]',
        fee: 500,
      });
    });

    test('does not mutate the caller object', () => {
      const snapshot = structuredClone(coinSelection);
      redactOne(coinSelection);
      expect(coinSelection).toEqual(snapshot);
    });
  });

  describe('nested sensitive values', () => {
    test('redacts addresses, txids, PSBT hex, xpubs and descriptors at any depth', () => {
      const result = redactOne({
        level1: {
          recipient: { address: testnetAddress, amount: 1000 },
          changeAddress: stacksAddress,
          psbtHex,
          txId: txid,
          account: { xpub, descriptor, publicKey },
        },
      });
      expect(result).toEqual({
        level1: {
          recipient: { address: '[redacted]', amount: 1000 },
          changeAddress: '[redacted]',
          psbtHex: '[redacted]',
          txId: '[redacted]',
          account: { xpub: '[redacted]', descriptor: '[redacted]', publicKey: '[redacted]' },
        },
      });
    });

    test('redacts sensitive values found by pattern under neutral keys', () => {
      const result = redactOne({
        note: `sent to ${nativeSegwitAddress} in ${txid}:0`,
        other: [legacyAddress, stacksAddress, xpub, psbtBase64, publicKey],
      });
      expect(result).toEqual({
        note: 'sent to [redacted] in [redacted]:0',
        other: ['[redacted]', '[redacted]', '[redacted]', '[redacted]', '[redacted]'],
      });
    });

    test('redacts the message string', () => {
      expect(redactLogArgs([`Broadcast ${txid}`])).toEqual(['Broadcast [redacted]']);
    });
  });

  describe('signPsbt RPC request', () => {
    test('redacts PSBT hex and sign-at addresses', () => {
      const request = {
        jsonrpc: '2.0',
        id: 'abc-123',
        method: 'signPsbt',
        params: { hex: psbtHex, signAtIndex: [0, 1], broadcast: false, network: 'mainnet' },
      };
      expect(redactOne(request)).toEqual({
        jsonrpc: '2.0',
        id: 'abc-123',
        method: 'signPsbt',
        params: { hex: '[redacted]', signAtIndex: [0, 1], broadcast: false, network: 'mainnet' },
      });
    });
  });

  describe('errors', () => {
    test('redacts an axios-like error carrying config.data', () => {
      const error = Object.assign(new Error(`Request failed for ${nativeSegwitAddress}`), {
        config: { url: 'https://api.example.com/tx', data: JSON.stringify({ tx: 'deadbeef' }) },
        response: { status: 400, data: { error: `bad input ${txid}` } },
      });
      const result = redactOne(error);
      expect(result).toBeInstanceOf(Error);
      expect(result).toMatchObject({
        message: 'Request failed for [redacted]',
        config: { url: 'https://api.example.com/tx', data: '[redacted]' },
        response: { status: 400, data: { error: 'bad input [redacted]' } },
      });
      expect(error.config.data).toContain('deadbeef');
    });

    test('redacts the stack and keeps the cause redacted', () => {
      const cause = new Error(`inner ${legacyAddress}`);
      const error = new Error('outer', { cause });
      error.stack = `Error: outer ${txid}\n    at fn (file.js:1:1)`;
      const result = redactOne(error);
      expect(result).toBeInstanceOf(Error);
      if (!(result instanceof Error)) return;
      expect(result.stack).toBe('Error: outer [redacted]\n    at fn (file.js:1:1)');
      expect(result.cause).toBeInstanceOf(Error);
      expect(result.cause).toMatchObject({ message: 'inner [redacted]' });
    });
  });

  describe('secrets', () => {
    test('redacts mnemonic-shaped values regardless of case and separator', () => {
      expect(redactOne(mnemonic)).toBe('[redacted]');
      expect(redactOne(mnemonic.toUpperCase())).toBe('[redacted]');
      expect(redactOne(mnemonic.split(' ').join(','))).toBe('[redacted]');
      expect(redactOne(mnemonic.split(' ').join(', '))).toBe('[redacted]');
      expect(redactOne(`words: ${mnemonic}.`)).toBe('words: [redacted].');
    });

    test('redacts WIF private keys', () => {
      expect(redactOne(`key ${wifPrivateKey}`)).toBe('key [redacted]');
      expect(redactOne('5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ')).toBe('[redacted]');
    });

    test('redacts secret keys by name', () => {
      expect(
        redactOne({ secretKey: 'short', privateKey: 'short', password: 'hunter2', mnemonic: 'x' })
      ).toEqual({
        secretKey: '[redacted]',
        privateKey: '[redacted]',
        password: '[redacted]',
        mnemonic: '[redacted]',
      });
    });
  });

  describe('fingerprints', () => {
    test('redacts fingerprints by key, including numeric ones', () => {
      expect(redactOne({ fingerprint, masterFingerprint: 0x0a1b2c3d })).toEqual({
        fingerprint: '[redacted]',
        masterFingerprint: '[redacted]',
      });
    });

    test('redacts a fingerprint followed by a derivation path without brackets', () => {
      expect(redactOne(`origin ${fingerprint}/84'/0'/0'`)).toBe('origin [redacted]');
    });

    test('redacts fingerprints in a message that mentions a fingerprint', () => {
      expect(redactLogArgs([`Migrated fingerprint: 00000000 → ${fingerprint}`])).toEqual([
        'Migrated fingerprint: [redacted] → [redacted]',
      ]);
    });

    test('treats keychainIds and keyOrigins as sensitive', () => {
      expect(
        redactOne({ keychainId: 'abc', keychainIds: ['a', 'b'], keyOrigin: 'x', keyOrigins: [] })
      ).toEqual({
        keychainId: '[redacted]',
        keychainIds: '[redacted: 2 items]',
        keyOrigin: '[redacted]',
        keyOrigins: '[redacted: 0 items]',
      });
    });
  });

  describe('readable values', () => {
    test('keeps fee, counts and method', () => {
      const value = { method: 'sendTransfer', fee: '1200', inputCount: 3, outputCount: 2 };
      expect(redactOne(value)).toEqual(value);
    });

    test('matches key names on whole camelCase words', () => {
      const value = {
        description: 'A description',
        subscription: 'monthly',
        transcript: 'hello',
        hexColor: '#ffffff',
        ctx: 'context',
        addressIndex: 4,
        addressType: 'p2wpkh',
        addressCount: 2,
      };
      expect(redactOne(value)).toEqual(value);
    });

    test('keeps numbers and booleans under address-related keys', () => {
      expect(redactOne({ address: 3, addresses: true })).toEqual({ address: 3, addresses: true });
    });

    test('keeps ordinary sentences and identifiers', () => {
      const sentence =
        'Unable to broadcast the transaction because the fee rate is too low for the network';
      expect(redactLogArgs([sentence, 'networkConfigurationMismatchErr'])).toEqual([
        sentence,
        'networkConfigurationMismatchErr',
      ]);
    });
  });

  describe('robustness', () => {
    test('does not throw on a non-string message', () => {
      expect(redactLogArgs([42, { a: 1 }])).toEqual([42, { a: 1 }]);
      expect(redactLogArgs([undefined])).toEqual([undefined]);
    });

    test('falls back to redacted for a throwing getter', () => {
      const value = {
        get boom() {
          throw new Error('nope');
        },
        ok: 1,
      };
      expect(redactOne(value)).toEqual({ boom: '[redacted]', ok: 1 });
    });

    test('handles circular references', () => {
      const value: Record<string, unknown> = { name: 'loop' };
      value.self = value;
      expect(redactOne(value)).toEqual({ name: 'loop', self: '[circular]' });
    });

    test('redacts byte arrays', () => {
      expect(redactOne({ bytes: new Uint8Array([1, 2, 3]) })).toEqual({ bytes: '[redacted]' });
    });
  });
});
