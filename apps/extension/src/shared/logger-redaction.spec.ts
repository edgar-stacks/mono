import { redactLogArgs } from './logger-redaction';

const redacted = '[redacted]';

const nativeSegwitAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const psbtHex =
  '70736274ff01007102000000011e9e1683e930853391bc6f35f605c6754cfead57cf8387639d3b4096c54f18f40000000000ffffffff';
const psbtBase64 = 'cHNidP8BAHECAAAAAR6eFoPpMIUzkbxvNfYFxnVM/q1Xz4OHY507QJbFTxj0AAAAAAD/////';
const xpub =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const descriptor = `wpkh([a1b2c3d4/84'/0'/0']${xpub}/0/*)`;
const mnemonic =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';
const wifPrivateKey = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';

function redactSingle(value: unknown) {
  return redactLogArgs(['message', value])[1];
}

function serialize(value: unknown) {
  return JSON.stringify(value);
}

describe(redactLogArgs.name, () => {
  it('redacts nested addresses, txids, PSBT hex, xpubs and descriptors', () => {
    const result = serialize(
      redactSingle({
        wallet: {
          account: { address: nativeSegwitAddress, label: `paid to ${taprootAddress}` },
          history: [{ id: txid }, { note: `outpoint ${txid}:1` }],
          request: { psbtHex, other: psbtBase64 },
          keys: { xpub, path: descriptor, stx: stacksAddress, legacy: legacyAddress },
        },
      })
    );

    [
      nativeSegwitAddress,
      taprootAddress,
      legacyAddress,
      stacksAddress,
      txid,
      psbtHex,
      psbtBase64,
      xpub,
      'a1b2c3d4',
    ].forEach(sensitive => expect(result).not.toContain(sensitive));
  });

  it('redacts sensitive strings in the message', () => {
    const [msg] = redactLogArgs([`Broadcast ${txid} to ${stacksAddress}`]);
    expect(msg).toEqual(`Broadcast ${redacted} to ${redacted}`);
  });

  it('redacts a signPsbt RPC request', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'abc',
      method: 'signPsbt',
      params: { hex: psbtHex, signAtIndex: [0], broadcast: false },
    };
    expect(redactSingle(request)).toEqual({
      jsonrpc: '2.0',
      id: 'abc',
      method: 'signPsbt',
      params: redacted,
    });
  });

  it('redacts an Error carrying config.data', () => {
    const error = Object.assign(new Error(`Request failed for ${nativeSegwitAddress}`), {
      config: {
        url: `https://api.example.com/address/${nativeSegwitAddress}/utxo`,
        method: 'post',
        data: JSON.stringify({ tx: psbtHex }),
      },
      response: { status: 400, data: { error: 'bad', txid } },
    });

    const result = redactSingle(error);
    const serialized = serialize(result);

    expect(serialized).not.toContain(nativeSegwitAddress);
    expect(serialized).not.toContain(psbtHex);
    expect(serialized).not.toContain(txid);
    expect(result).toMatchObject({
      name: 'Error',
      message: `Request failed for ${redacted}`,
      config: { method: 'post', data: redacted },
      response: { status: 400, data: redacted },
    });
  });

  it('keeps Error.cause and redacts it recursively', () => {
    const error = new Error('Outer', { cause: new Error(`Inner ${txid}`) });
    expect(redactSingle(error)).toMatchObject({
      message: 'Outer',
      cause: { name: 'Error', message: `Inner ${redacted}` },
    });
  });

  it('redacts mnemonic-shaped values regardless of case and separator', () => {
    expect(redactSingle(mnemonic)).toEqual(redacted);
    expect(redactSingle(mnemonic.toUpperCase())).toEqual(redacted);
    expect(redactSingle(mnemonic.split(' ').join(', '))).toEqual(redacted);
    expect(redactSingle(`Imported ${mnemonic} today`)).not.toContain('abandon');
  });

  it('redacts private-key-shaped values', () => {
    expect(redactSingle({ note: wifPrivateKey })).toEqual({ note: redacted });
    expect(redactSingle({ privateKey: 'anything', secretKey: 'anything' })).toEqual({
      privateKey: redacted,
      secretKey: redacted,
    });
    expect(redactSingle({ password: 'hunter2', mnemonic: 'abc' })).toEqual({
      password: redacted,
      mnemonic: redacted,
    });
  });

  it('redacts fingerprints by key and by key origin pattern', () => {
    expect(
      redactSingle({
        fingerprint: 'a1b2c3d4',
        keychainId: 'x',
        keychainIds: ['x'],
        keyOrigin: 'y',
        keyOrigins: ['y'],
        publicKey,
      })
    ).toEqual({
      fingerprint: redacted,
      keychainId: redacted,
      keychainIds: '[1 items]',
      keyOrigin: redacted,
      keyOrigins: '[1 items]',
      publicKey: redacted,
    });
    expect(redactSingle(`origin a1b2c3d4/84'/0'/0'`)).toEqual(`origin ${redacted}`);
    expect(redactSingle(`origin [a1b2c3d4/84h/0h/0h]`)).toEqual(`origin ${redacted}`);
  });

  it('collapses UTXO arrays to a count and keeps non-identifying fields', () => {
    const coinSelection = {
      inputs: [
        { address: nativeSegwitAddress, txid, vout: 0, value: 1000 },
        { address: taprootAddress, txid, vout: 1, value: 2000 },
      ],
      outputs: [{ address: legacyAddress, value: 2500 }],
      fee: 500,
      inputCount: 2,
      method: 'sendTransfer',
    };
    expect(redactSingle(coinSelection)).toEqual({
      inputs: '[2 items]',
      outputs: '[1 items]',
      fee: 500,
      inputCount: 2,
      method: 'sendTransfer',
    });
  });

  it('does not mutate the caller input', () => {
    const input = { address: nativeSegwitAddress, nested: { txid, list: [publicKey] } };
    const snapshot = structuredClone(input);
    redactLogArgs(['message', input]);
    expect(input).toEqual(snapshot);
  });

  it('keeps readable keys that only contain sensitive substrings', () => {
    const value = {
      description: 'A token',
      subscription: 'monthly',
      transcript: 'hello',
      hexColor: '#ffffff',
      ctx: 'context',
      addressIndex: 3,
      addressType: 'p2wpkh',
      addressCount: 5,
      isAddressValid: true,
    };
    expect(redactSingle(value)).toEqual(value);
  });

  it('keeps ordinary English sentences and identifiers', () => {
    const sentence =
      'The account balance could not be loaded because the network request failed after several retries';
    expect(redactSingle(sentence)).toEqual(sentence);
    expect(redactSingle('networkConfigurationMismatchErr')).toEqual(
      'networkConfigurationMismatchErr'
    );
  });

  it('never throws', () => {
    const throwing = {
      get secretValue() {
        throw new Error('boom');
      },
      ok: 'fine',
    };
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic.self = cyclic;

    expect(redactLogArgs([42, throwing])).toEqual([
      redacted,
      { secretValue: redacted, ok: 'fine' },
    ]);
    expect(redactLogArgs(['message', cyclic])).toEqual([
      'message',
      { name: 'loop', self: '[circular]' },
    ]);
  });
});
