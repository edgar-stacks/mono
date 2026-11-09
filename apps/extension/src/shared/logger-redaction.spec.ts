import { describe, expect, test } from 'vitest';

import { redactLogArgs, redactLogMessage } from './logger-redaction';

const txid = '5e2383defe7efcbdc9fdd6dba55da148b206617bbb49e6bb93fce7bfbb459d44';
const bech32Address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const wif = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
const xpub =
  'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';
const psbtBase64 =
  'cHNidP8BAHECAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUA==';
const psbtHex = `70736274ff0100${txid}`;
const mnemonic =
  'abandon ability able about above absent absorb abstract absurd abuse access accident';

function redactArg(value: unknown) {
  return redactLogArgs([value])[0];
}

describe('redactLogArgs', () => {
  test('summarises sensitive arrays in nested objects and keeps readable diagnostics', () => {
    const coinSelection = {
      inputs: [{ txid, address: bech32Address, value: 1000 }, { txid }],
      outputs: [{ address: bech32Address, value: 500 }, { value: 400 }],
      fee: 1000,
      inputCount: 2,
    };

    expect(redactArg(coinSelection)).toEqual({
      inputs: '[2 items]',
      outputs: '[2 items]',
      fee: 1000,
      inputCount: 2,
    });
    expect(redactArg({ wallet: { utxos: [1, 2, 3], outpoints: ['a', 'b'] } })).toEqual({
      wallet: { utxos: '[3 items]', outpoints: '[2 items]' },
    });
  });

  test('redacts sensitive keys while keeping qualifiers of them readable', () => {
    expect(
      redactArg({
        address: bech32Address,
        stxPublicKey: '02abc',
        currentAccountStacksDescriptor: 'descriptor',
        addressIndex: 3,
        addressType: 'p2wpkh',
        description: 'A collectible',
        missingTxid: undefined,
        emptyAddress: null,
      })
    ).toEqual({
      address: '[redacted]',
      stxPublicKey: '[redacted]',
      currentAccountStacksDescriptor: '[redacted]',
      addressIndex: 3,
      addressType: 'p2wpkh',
      description: 'A collectible',
      missingTxid: undefined,
      emptyAddress: null,
    });
  });

  test('keeps the method and id of a signPsbt request and drops its psbt', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'signPsbt',
      params: { hex: psbtHex, psbt: psbtBase64, signAtIndex: [0], network: 'mainnet' },
    };

    const result = redactArg(request);

    expect(result).toEqual({
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'signPsbt',
      params: {
        hex: '[redacted]',
        psbt: '[redacted]',
        signAtIndex: [0],
        network: 'mainnet',
      },
    });
    expect(JSON.stringify(result)).not.toContain(txid);
  });

  test('redacts addresses, keys, psbts and txids inside strings', () => {
    expect(
      redactArg(
        `Paying ${bech32Address}, ${legacyAddress} and ${stacksAddress} from ${xpub} with ${psbtBase64}`
      )
    ).toBe('Paying [redacted], [redacted] and [redacted] from [redacted] with [redacted]');
    expect(redactArg(`Spent ${txid}:1 and ${psbtHex}`)).toBe('Spent [redacted] and [redacted]');
  });

  test('redacts WIFs', () => {
    expect(redactArg(`Imported ${wif}`)).toBe('Imported [redacted]');
    expect(redactArg({ key: wif })).toEqual({ key: '[redacted]' });
  });

  test('redacts mnemonics in any case, separated by spaces or commas', () => {
    expect(redactArg(`Phrase was ${mnemonic} yesterday`)).toBe('Phrase was [redacted] yesterday');
    expect(redactArg(mnemonic.toUpperCase().split(' ').join(', '))).toBe('[redacted]');
    expect(redactArg({ words: mnemonic.split(' ') })).toEqual({
      words: mnemonic.split(' '),
    });
    expect(redactArg({ secret: mnemonic })).toEqual({ secret: '[redacted]' });
  });

  test('redacts fingerprints in key origins and keychain ids', () => {
    expect(redactArg({ origin: "a1b2c3d4/84'/0'/0'", keychainId: "a1b2c3d4/84'/0'/0'" })).toEqual({
      origin: "[redacted]/84'/0'/0'",
      keychainId: '[redacted]',
    });
    expect(redactArg('wpkh([a1b2c3d4/84h/0h/0h]02ab)')).toBe('wpkh([[redacted]/84h/0h/0h]02ab)');
  });

  test('keeps the messages of an axios-like error with its causes and redacts their values', () => {
    const cause = new Error(`Rejected ${txid}`, { cause: { address: bech32Address } });
    const error = Object.assign(new Error('Broadcast failed', { cause }), {
      code: 'ERR_BAD_REQUEST',
      config: { method: 'post', url: `https://mempool.space/api/address/${bech32Address}` },
      response: { status: 400, data: `Transaction ${txid} rejected` },
    });

    const result = redactArg(error);

    expect(result).toMatchObject({
      name: 'Error',
      message: 'Broadcast failed',
      cause: {
        name: 'Error',
        message: 'Rejected [redacted]',
        cause: { address: '[redacted]' },
      },
      code: 'ERR_BAD_REQUEST',
      config: { method: 'post', url: 'https://mempool.space/api/address/[redacted]' },
      response: { status: 400, data: 'Transaction [redacted] rejected' },
    });
    expect(JSON.stringify(result)).not.toContain(txid);
    expect(JSON.stringify(result)).not.toContain(bech32Address);
  });

  test('converts dates and big numbers to strings', async () => {
    const { default: BigNumber } = await import('bignumber.js');

    expect(
      redactArg({ createdAt: new Date('2026-01-02T03:04:05.000Z'), amount: new BigNumber(12.5) })
    ).toEqual({ createdAt: '2026-01-02T03:04:05.000Z', amount: '12.5' });
  });

  test('marks circular references', () => {
    const request: Record<string, unknown> = { method: 'signPsbt' };
    request.self = request;

    expect(redactArg(request)).toEqual({ method: 'signPsbt', self: '[circular]' });
  });

  test('redacts an object whose properties cannot be read', () => {
    const unreadable = {
      get address() {
        throw new Error('nope');
      },
    };

    expect(redactArg(unreadable)).toBe('[redacted]');
  });

  test('does not mutate the caller input', () => {
    const input = { inputs: [{ txid }], nested: { address: bech32Address, note: `To ${txid}` } };
    const snapshot = structuredClone(input);

    redactLogArgs([input]);

    expect(input).toEqual(snapshot);
  });

  test('passes readable diagnostics through unchanged', () => {
    const diagnostics = {
      fee: 1000,
      inputCount: 2,
      outputCount: 3,
      totalInputValue: 5000,
      method: 'signPsbt',
    };
    const prose =
      'The wallet could not reach the network, so the transaction was not broadcast and nothing was spent';

    expect(
      redactLogArgs([diagnostics, 'plain text', 42, prose, 'networkConfigurationMismatchErr'])
    ).toEqual([diagnostics, 'plain text', 42, prose, 'networkConfigurationMismatchErr']);
  });
});

describe('redactLogMessage', () => {
  test('redacts fingerprints next to the word fingerprint', () => {
    expect(redactLogMessage('Successfully migrated Ledger fingerprint: 00000000 → a1b2c3d4')).toBe(
      'Successfully migrated Ledger fingerprint: [redacted] → [redacted]'
    );
  });

  test('stringifies non-string messages after redaction', () => {
    expect(redactLogMessage({ method: 'signPsbt', address: bech32Address })).toBe(
      '{"method":"signPsbt","address":"[redacted]"}'
    );
    expect(redactLogMessage(undefined)).toBe('[redacted]');
  });

  test('keeps plain text', () => {
    expect(redactLogMessage('Coin selection')).toBe('Coin selection');
  });
});
