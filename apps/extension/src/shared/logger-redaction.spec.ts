import { describe, expect, test } from 'vitest';

import { redactLogArgs, redactString } from './logger-redaction';

const redacted = '[redacted]';

const nativeSegwitAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const psbtHex = `70736274ff0100${'ab'.repeat(40)}`;
const psbtBase64 = 'cHNidP8BAHECAAAAAfQYT8WWQDudY4eDz1et/kx1xgX2NW+8kTOFMOmDHp4WAAAAAAD/////';
const xpub =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const fingerprint = 'd34db33f';
const descriptor = `wpkh([${fingerprint}/84'/0'/0']${xpub}/0/*)`;
const publicKey = '02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const uncompressedWif = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
const compressedWif = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';

function serialize(value: unknown) {
  return JSON.stringify(value);
}

function createCoinSelection() {
  return {
    inputs: [
      { address: nativeSegwitAddress, txid, vout: 0, value: 10_000 },
      { address: taprootAddress, txid, vout: 1, value: 5_000 },
    ],
    outputs: [
      { address: legacyAddress, value: 12_000 },
      { address: nativeSegwitAddress, value: 2_500 },
    ],
    fee: 500,
  };
}

function createAxiosLikeError() {
  const error = new Error(`Request failed broadcasting ${txid}`);
  Object.assign(error, {
    config: {
      url: 'https://api.example.com/v1/broadcast',
      method: 'post',
      data: JSON.stringify({ tx: psbtHex, sender: stacksAddress }),
    },
    response: { status: 400, data: { error: 'transaction rejected', txid } },
  });
  return error;
}

describe(redactLogArgs.name, () => {
  test('redacts nested addresses, txids, PSBT hex, xpubs and descriptors', () => {
    const args = redactLogArgs([
      'Signing',
      {
        request: {
          params: {
            hex: psbtHex,
            account: { addresses: { nativeSegwit: nativeSegwitAddress } },
            meta: { note: `pay ${stacksAddress} from ${taprootAddress}` },
            psbtBase64Payload: psbtBase64,
            extended: xpub,
            currentAccountStacksDescriptor: descriptor,
            outpoint: `${txid}:0`,
          },
        },
      },
    ]);

    const output = serialize(args);
    for (const sensitive of [
      psbtHex,
      nativeSegwitAddress,
      stacksAddress,
      taprootAddress,
      psbtBase64,
      xpub,
      fingerprint,
      txid,
    ])
      expect(output).not.toContain(sensitive);
  });

  test('redacts sensitive values found in free text', () => {
    expect(redactString(`send to ${nativeSegwitAddress}`)).toBe(`send to ${redacted}`);
    expect(redactString(`legacy ${legacyAddress}`)).toBe(`legacy ${redacted}`);
    expect(redactString(`broadcast ${txid}`)).toBe(`broadcast ${redacted}`);
    expect(redactString(`key ${publicKey}`)).toBe(`key ${redacted}`);
    expect(redactString(descriptor)).not.toContain(fingerprint);
  });

  test('redacts an Error carrying config.data and response', () => {
    const [, error] = redactLogArgs(['Broadcast failed', createAxiosLikeError()]);

    const output = serialize(error);
    expect(output).not.toContain(psbtHex);
    expect(output).not.toContain(stacksAddress);
    expect(output).not.toContain(txid);
    expect(output).toContain('Request failed broadcasting');
    expect(output).toContain('https://api.example.com/v1/broadcast');
    expect(output).toContain('400');
  });

  test('keeps and redacts Error.cause recursively', () => {
    const cause = new Error(`inner ${nativeSegwitAddress}`);
    const [, error] = redactLogArgs(['Failed', new Error('outer', { cause })]);

    expect(error).toMatchObject({ message: 'outer', cause: { message: `inner ${redacted}` } });
  });

  test('redacts mnemonic-shaped values in any case and with comma separators', () => {
    expect(redactString(mnemonic)).toBe(redacted);
    expect(redactString(`phrase: ${mnemonic.toUpperCase()}`)).toBe(`phrase: ${redacted}`);
    expect(redactString(mnemonic.split(' ').join(', '))).toBe(redacted);
    expect(redactString(mnemonic.split(' ').join(','))).toBe(redacted);
  });

  test('redacts private-key-shaped values', () => {
    expect(redactString(`wif ${uncompressedWif}`)).toBe(`wif ${redacted}`);
    expect(redactString(`wif ${compressedWif}`)).toBe(`wif ${redacted}`);
    expect(redactString('cVt4o7BGAig1UXywgGSmARhxMdzP5qvQsxKkSsc1XEkw3tDTQFpy')).toBe(redacted);
    expect(redactString(`key ${'1f'.repeat(32)}`)).toBe(`key ${redacted}`);
  });

  test('redacts values under secret keys', () => {
    const [, value] = redactLogArgs([
      'Secrets',
      { secretKey: 'anything', password: 'hunter2', mnemonicPhrase: 'a b c', privateKey: 'x' },
    ]);

    expect(value).toEqual({
      secretKey: redacted,
      password: redacted,
      mnemonicPhrase: redacted,
      privateKey: redacted,
    });
  });

  test('redacts fingerprints', () => {
    const [msg, value] = redactLogArgs([
      `Successfully migrated Ledger fingerprint: 00000000 → ${fingerprint}`,
      { fingerprint, masterFingerprint: 0x12345678, keyOrigin: `${fingerprint}/84'/0'/0'` },
    ]);

    expect(msg).toBe(`Successfully migrated Ledger fingerprint: ${redacted} → ${redacted}`);
    expect(value).toEqual({
      fingerprint: redacted,
      masterFingerprint: redacted,
      keyOrigin: redacted,
    });
    expect(redactString(`origin ${fingerprint}/84'/0'/0'`)).toBe(`origin ${redacted}/84'/0'/0'`);
  });

  test('redacts keychain ids and key origins', () => {
    const [, value] = redactLogArgs([
      'Keychains',
      { keychainId: 'abc', keychainIds: ['abc', 'def'], keyOrigins: ['abc'] },
    ]);

    expect(value).toEqual({
      keychainId: redacted,
      keychainIds: '[redacted: 2 items]',
      keyOrigins: '[redacted: 1 items]',
    });
  });

  test('collapses a UTXO array to a count', () => {
    const [, value] = redactLogArgs([
      'Coin selection',
      { ...createCoinSelection(), utxos: [{ txid }, { txid }, { txid }] },
    ]);

    expect(value).toEqual({
      inputs: '[redacted: 2 items]',
      outputs: '[redacted: 2 items]',
      utxos: '[redacted: 3 items]',
      fee: 500,
    });
  });

  test('does not mutate the caller input', () => {
    const coinSelection = createCoinSelection();
    const error = createAxiosLikeError();
    const snapshot = structuredClone(coinSelection);
    const errorMessage = error.message;

    redactLogArgs(['Coin selection', coinSelection, error]);

    expect(coinSelection).toEqual(snapshot);
    expect(error.message).toBe(errorMessage);
    expect(Reflect.get(error, 'config')).toMatchObject({
      data: JSON.stringify({ tx: psbtHex, sender: stacksAddress }),
    });
  });

  test('keeps fee, counts, method and other non-identifying values', () => {
    const [msg, value] = redactLogArgs([
      'Received RPC request signPsbt',
      {
        method: 'signPsbt',
        id: 'req-1',
        fee: 1_200,
        inputCount: 3,
        outputCount: 2,
        totalInputValue: 15_000,
        addressIndex: 4,
        addressType: 'p2wpkh',
        addressCount: 2,
        isAddressReused: false,
        description: 'Swap tokens',
        subscription: 'monthly',
        transcript: 'none',
        hexColor: '#ff5500',
        ctx: 'popup',
        error: 'networkConfigurationMismatchErr',
        reason: 'The user rejected the request because the network did not match the one selected',
      },
    ]);

    expect(msg).toBe('Received RPC request signPsbt');
    expect(value).toEqual({
      method: 'signPsbt',
      id: 'req-1',
      fee: 1_200,
      inputCount: 3,
      outputCount: 2,
      totalInputValue: 15_000,
      addressIndex: 4,
      addressType: 'p2wpkh',
      addressCount: 2,
      isAddressReused: false,
      description: 'Swap tokens',
      subscription: 'monthly',
      transcript: 'none',
      hexColor: '#ff5500',
      ctx: 'popup',
      error: 'networkConfigurationMismatchErr',
      reason: 'The user rejected the request because the network did not match the one selected',
    });
  });

  test('does not redact ordinary English sentences', () => {
    const sentence =
      'Please make sure your device is unlocked and the bitcoin app is open before you try again';
    expect(redactString(sentence)).toBe(sentence);
  });

  test('never throws', () => {
    const withThrowingGetter = {
      fee: 1,
      get broken() {
        throw new Error('boom');
      },
    };
    const circular: Record<string, unknown> = { fee: 2 };
    circular.self = circular;

    expect(redactLogArgs([42, withThrowingGetter, circular])).toEqual([
      redacted,
      { fee: 1, broken: redacted },
      { fee: 2, self: '[circular]' },
    ]);
  });
});
