import { redactLogArgs } from './logger-redaction';

const redacted = '[redacted]';

const nativeSegwitAddress = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const legacyAddress = '1JaUQDVNRdhfNsVncGkXedaPSM5Gc54Hso';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'b3a2f5c1d7e9084a6c5b3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a';
const publicKey = '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c';
const psbtHex =
  '70736274ff0100520200000001b3a2f5c1d7e9084a6c5b3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a0000000000ffffffff';
const psbtBase64 = 'cHNidP8BAFICAAAAAbOi9cHX6QhKbFs9Lh8Km4x9bl9KOywdDp+Kp7bF1OPyAAAAAAD/////';
const xpub =
  'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
const fingerprint = '73c5da0a';
const descriptor = `[${fingerprint}/84'/0'/0']${xpub}`;
const wif = 'KyZpNDKnfs94vbrwhJneDi77V6jF64PWPF8x5cdJb8ifgg2DUc9d';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function redactArg(arg: unknown) {
  return redactLogArgs(['message', arg])[1];
}

describe(redactLogArgs.name, () => {
  test('redacts nested addresses, txids, PSBT hex, xpubs and descriptors', () => {
    const result = redactArg({
      request: {
        params: {
          psbt: psbtHex,
          hex: psbtHex,
          recipient: { to: nativeSegwitAddress },
          account: { xpub, descriptor },
        },
      },
      txid,
    });

    expect(result).toEqual({
      request: {
        params: {
          psbt: redacted,
          hex: redacted,
          recipient: { to: redacted },
          account: { xpub: redacted, descriptor: redacted },
        },
      },
      txid: redacted,
    });
  });

  test('redacts sensitive values inside free text', () => {
    const [msg, detail] = redactLogArgs([
      `Broadcast ${txid} from ${nativeSegwitAddress}`,
      `Sent to ${legacyAddress} and ${stacksAddress} with key ${publicKey} psbt ${psbtBase64} at [${fingerprint}/84'/0'/0']${xpub}`,
    ]);

    expect(msg).toEqual(`Broadcast ${redacted} from ${redacted}`);
    expect(detail).toEqual(
      `Sent to ${redacted} and ${redacted} with key ${redacted} psbt ${redacted} at [${redacted}/84'/0'/0']${redacted}`
    );
  });

  test('redacts an Error carrying request config data', () => {
    const error = Object.assign(new Error(`Request failed for ${nativeSegwitAddress}`), {
      config: {
        url: 'https://api.example.com/tx',
        data: JSON.stringify({ tx: psbtHex, sender: stacksAddress }),
      },
      response: { status: 400, data: { address: nativeSegwitAddress } },
    });

    const result = redactArg(error);

    expect(result).toBeInstanceOf(Error);
    expect(result).toMatchObject({
      message: `Request failed for ${redacted}`,
      config: {
        url: 'https://api.example.com/tx',
        data: JSON.stringify({ tx: redacted, sender: redacted }),
      },
      response: { status: 400, data: { address: redacted } },
    });
    expect(JSON.stringify(result)).not.toContain(nativeSegwitAddress);
  });

  test('keeps Error causes and redacts them recursively', () => {
    const error = new Error('Signing failed', {
      cause: new Error(`Unknown input ${txid}:0`),
    });

    const result = redactArg(error);

    expect(result).toHaveProperty('cause.message', `Unknown input ${redacted}:0`);
  });

  test('redacts mnemonic-shaped values', () => {
    expect(redactArg(mnemonic)).toEqual(redacted);
    expect(redactArg(mnemonic.toUpperCase())).toEqual(redacted);
    expect(redactArg(mnemonic.split(' ').join(', '))).toEqual(redacted);
    expect(redactArg(`Restoring wallet from ${mnemonic} is done`)).toEqual(
      `Restoring wallet from ${redacted} is done`
    );
  });

  test('redacts private-key-shaped values', () => {
    expect(redactArg(wif)).toEqual(redacted);
    expect(redactArg(`key ${wif}`)).toEqual(`key ${redacted}`);
    expect(redactArg({ privateKey: wif, secretKey: wif, password: 'hunter2' })).toEqual({
      privateKey: redacted,
      secretKey: redacted,
      password: redacted,
    });
  });

  test('redacts fingerprints', () => {
    expect(
      redactArg({ fingerprint, keyOrigin: `${fingerprint}/84'/0'/0'`, keychainIds: ['a'] })
    ).toEqual({ fingerprint: redacted, keyOrigin: redacted, keychainIds: '[1 items]' });
    expect(redactArg(`${fingerprint}/84'/0'/0'`)).toEqual(`${redacted}/84'/0'/0'`);
    expect(redactArg({ accountIdentifier: `${fingerprint}/0` })).toEqual({
      accountIdentifier: `${redacted}/0`,
    });
    expect(redactLogArgs([`Migrated Ledger fingerprint: 00000000 → ${fingerprint}`])).toEqual([
      `Migrated Ledger fingerprint: ${redacted} → ${redacted}`,
    ]);
  });

  test('collapses UTXO arrays to a count', () => {
    const utxo = { address: nativeSegwitAddress, txid, vout: 0, value: 1000 };

    expect(redactArg({ inputs: [utxo, utxo], outputs: [utxo], utxos: [utxo], fee: 300 })).toEqual({
      inputs: '[2 items]',
      outputs: '[1 items]',
      utxos: '[1 items]',
      fee: 300,
    });
  });

  test('does not mutate the input object', () => {
    const input = { inputs: [{ address: nativeSegwitAddress, txid }], meta: { psbt: psbtHex } };
    const snapshot = structuredClone(input);

    redactArg(input);

    expect(input).toEqual(snapshot);
  });

  test('keeps fee, counts, method and other non-identifying fields', () => {
    const args = {
      method: 'signPsbt',
      id: '7c4c1f2a-1b4e-4d8a-9a52-8d7f0a3c2b1e',
      fee: '1200',
      inputCount: 3,
      outputCount: 2,
      totalInputValue: '150000',
      addressIndex: 4,
      addressType: 'p2wpkh',
      addressCount: 2,
      description: 'Swap tokens',
      subscription: 'daily',
      transcript: 'notes',
      hexColor: '#ff0000',
      ctx: 'popup',
      level: 'info',
    };

    expect(redactArg(args)).toEqual(args);
  });

  test('does not redact ordinary sentences and identifiers', () => {
    const sentence =
      'The quick brown fox jumps over the lazy dog while the user waits for the network to respond';

    expect(redactLogArgs([sentence, 'networkConfigurationMismatchErr'])).toEqual([
      sentence,
      'networkConfigurationMismatchErr',
    ]);
  });

  test('never throws', () => {
    const withThrowingGetter = {
      fee: 100,
      get address() {
        throw new Error('boom');
      },
      get details() {
        throw new Error('boom');
      },
    };
    const circular: Record<string, unknown> = { fee: 1 };
    circular.self = circular;

    expect(redactLogArgs([{ address: nativeSegwitAddress }, withThrowingGetter, circular])).toEqual(
      [redacted, { fee: 100, address: redacted, details: redacted }, { fee: 1, self: '[circular]' }]
    );
  });
});
