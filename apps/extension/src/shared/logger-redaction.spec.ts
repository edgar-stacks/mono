import { describe, expect, test } from 'vitest';

import { redactLogArgs } from './logger-redaction';

const nativeSegwitAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const testnetLegacyAddress = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const psbtHex = `70736274ff0100${'ab'.repeat(40)}`;
const xpub =
  'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';
const descriptor = `wpkh([a1b2c3d4/84'/0'/0']${xpub}/0/*)`;
const compressedPublicKey = `02${'c6'.repeat(32)}`;
const uncompressedWif = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
const compressedWif = 'KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function redactOne(value: unknown) {
  const [, redacted] = redactLogArgs(['Log message', value]);
  return redacted;
}

function serialize(value: unknown) {
  return JSON.stringify(redactOne(value));
}

describe('redactLogArgs', () => {
  test('redacts addresses, txids, PSBT hex, xpubs and descriptors in nested objects', () => {
    const output = serialize({
      wallet: {
        recipients: [{ address: nativeSegwitAddress, amount: 1000 }],
        changeAddress: taprootAddress,
        utxo: { txid, vout: 0 },
        psbtHex,
        currentAccountStacksDescriptor: descriptor,
        note: `${legacyAddress} ${testnetLegacyAddress} ${stacksAddress} ${xpub} ${txid}:1`,
        publicKey: compressedPublicKey,
      },
    });

    for (const secret of [
      nativeSegwitAddress,
      taprootAddress,
      legacyAddress,
      testnetLegacyAddress,
      stacksAddress,
      txid,
      psbtHex,
      xpub,
      'a1b2c3d4',
      compressedPublicKey,
    ])
      expect(output).not.toContain(secret);
    expect(output).toContain('[redacted]');
  });

  test('redacts sensitive values found in free text by pattern', () => {
    expect(redactOne(`Sending to ${nativeSegwitAddress} from ${stacksAddress}`)).toBe(
      'Sending to [redacted] from [redacted]'
    );
    expect(redactOne(`Broadcast ${txid}:0`)).toBe('Broadcast [redacted]:0');
    expect(redactOne(`Public key ${compressedPublicKey}`)).toBe('Public key [redacted]');
    expect(redactLogArgs([`Broadcast ${txid}`])).toEqual(['Broadcast [redacted]']);
  });

  test('redacts an Error carrying a request config and keeps its cause', () => {
    const cause = new Error(`Input ${txid} not found`);
    const error = Object.assign(new Error(`Failed to broadcast to ${nativeSegwitAddress}`), {
      config: { url: '/tx', data: JSON.stringify({ tx: psbtHex, sender: stacksAddress }) },
      response: { status: 400, data: { error: `bad address ${legacyAddress}` } },
      cause,
    });

    const redacted = redactOne(error);
    const output = JSON.stringify(redacted);

    for (const secret of [nativeSegwitAddress, txid, psbtHex, stacksAddress, legacyAddress])
      expect(output).not.toContain(secret);
    expect(redacted).toMatchObject({
      name: 'Error',
      message: 'Failed to broadcast to [redacted]',
      response: { status: 400 },
      cause: { message: 'Input [redacted] not found' },
    });
    expect(output).toContain('"stack"');
  });

  test('redacts mnemonic-shaped values regardless of case and separator', () => {
    expect(redactOne(`phrase: ${mnemonic}`)).toBe('phrase: [redacted]');
    expect(redactOne(mnemonic.toUpperCase())).toBe('[redacted]');
    expect(redactOne(mnemonic.split(' ').join(', '))).toBe('[redacted]');
    expect(redactOne({ note: mnemonic.split(' ').join(',') })).toEqual({ note: '[redacted]' });
  });

  test('redacts private-key-shaped values', () => {
    expect(redactOne(`wif ${uncompressedWif}`)).toBe('wif [redacted]');
    expect(redactOne(`wif ${compressedWif}`)).toBe('wif [redacted]');
    expect(redactOne({ privateKey: 'anything', secretKey: 'words', password: 'hunter2' })).toEqual({
      privateKey: '[redacted]',
      secretKey: '[redacted]',
      password: '[redacted]',
    });
  });

  test('redacts fingerprints by key, derivation path and mention', () => {
    expect(redactOne({ fingerprint: 'a1b2c3d4', keyOrigin: "a1b2c3d4/84'/0'/0'" })).toEqual({
      fingerprint: '[redacted]',
      keyOrigin: '[redacted]',
    });
    expect(redactOne({ keychainIds: ["a1b2c3d4/84'/0'/0'"], keyOrigins: ['x'] })).toEqual({
      keychainIds: '[1 items redacted]',
      keyOrigins: '[1 items redacted]',
    });
    expect(redactOne("origin a1b2c3d4/84'/0'/0'/0/1 in use")).toBe('origin [redacted] in use');
    expect(redactOne('Successfully migrated Ledger fingerprint: 00000000 → a1b2c3d4')).toBe(
      'Successfully migrated Ledger fingerprint: [redacted] → [redacted]'
    );
  });

  test('collapses UTXO arrays to a count', () => {
    const inputs = [
      { address: nativeSegwitAddress, txid, vout: 0, value: 5000 },
      { address: taprootAddress, txid, vout: 1, value: 7000 },
    ];

    expect(redactOne({ inputs, utxos: inputs, outpoints: [`${txid}:0`], fee: 300 })).toEqual({
      inputs: '[2 items redacted]',
      utxos: '[2 items redacted]',
      outpoints: '[1 items redacted]',
      fee: 300,
    });
  });

  test('does not mutate the caller object', () => {
    const request = {
      method: 'signPsbt',
      params: { hex: psbtHex, signAtIndex: [0], account: { address: nativeSegwitAddress } },
    };
    const snapshot = structuredClone(request);

    const redacted = redactOne(request);

    expect(request).toEqual(snapshot);
    expect(redacted).not.toBe(request);
    expect(redacted).toEqual({
      method: 'signPsbt',
      params: { hex: '[redacted]', signAtIndex: [0], account: { address: '[redacted]' } },
    });
  });

  test('keeps fee, counts, method and other non-identifying fields readable', () => {
    const summary = {
      method: 'sendTransfer',
      id: '0c5e4b0a-1d2e-4f3a-9b8c-7d6e5f4a3b2c',
      fee: 1250,
      inputCount: 3,
      outputCount: 2,
      inputTotal: '150000',
      addressIndex: 4,
      addressType: 'p2wpkh',
      addressCount: 10,
      isTestnet: false,
      description: 'Swap tokens',
      subscription: 'daily',
      transcript: 'hello',
      hexColor: '#ff00aa',
      ctx: 'popup',
      error: 'networkConfigurationMismatchErr',
      message: 'The quick brown fox jumps over the lazy dog while the cat sleeps on a warm mat',
    };

    expect(redactOne(summary)).toEqual(summary);
    expect(redactLogArgs(['Coin selection', summary])).toEqual(['Coin selection', summary]);
  });

  test('never throws on hostile input', () => {
    const throwingGetter = {
      get address() {
        throw new Error('boom');
      },
      get details() {
        throw new Error('boom');
      },
    };
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    const throwingProxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('boom');
        },
      }
    );

    expect(redactOne(throwingGetter)).toEqual({ address: '[redacted]', details: '[redacted]' });
    expect(redactOne(circular)).toEqual({ name: 'loop', self: '[circular]' });
    expect(redactOne(throwingProxy)).toBe('[redacted]');
    expect(redactLogArgs([42, null, undefined, { msg: txid }])).toEqual([
      '[redacted]',
      null,
      undefined,
      { msg: '[redacted]' },
    ]);
    expect(redactLogArgs([throwingProxy])).toEqual(['[redacted]']);
    expect(redactLogArgs([])).toEqual(['[redacted]']);
  });

  test('redacts byte arrays', () => {
    expect(redactOne({ key: new Uint8Array([1, 2, 3]) })).toEqual({ key: '[redacted]' });
  });
});
