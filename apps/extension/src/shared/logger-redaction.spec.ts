import BigNumber from 'bignumber.js';
import { describe, expect, test } from 'vitest';

import { redactLogArgs, redactLogMessage } from './logger-redaction';

const nativeSegwitAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
const legacyAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const nestedSegwitAddress = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const xpub =
  'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';
const wif = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
const psbtBase64 =
  'cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwA4fUFAAAAABepFDVF5uM7gyxHBQ8k0+65PJwDlIvHh7MuEwAA';
const psbtHex =
  '70736274ff01007502000000012681713713def285e937adeea4b37b78000c0566cbb3ad64641713ca42171bf60000000000feffffff02d3dff505000000001976a914d0c59903c5bac2868760e90fd521a4665aa7652088ac00e1f5050000000017a9143545e6e33b832c47050f24d3eeb93c9c03948bc787b32e1300';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function redactArg(arg: unknown) {
  return redactLogArgs([arg])[0];
}

describe(redactLogArgs.name, () => {
  test('replaces sensitive arrays with their length and keeps counts and fees', () => {
    const coinSelection = {
      inputs: [
        { txid, vout: 0, value: 1000, address: nativeSegwitAddress },
        { txid, vout: 1, value: 2000, address: taprootAddress },
      ],
      outputs: [{ value: 1500, address: legacyAddress }, { value: 500 }],
      fee: 1000,
      inputCount: 2,
    };

    expect(redactArg(coinSelection)).toEqual({
      inputs: '[2 items]',
      outputs: '[2 items]',
      fee: 1000,
      inputCount: 2,
    });
    expect(redactArg({ utxos: [1, 2, 3], outpoints: ['a', 'b'] })).toEqual({
      utxos: '[3 items]',
      outpoints: '[2 items]',
    });
  });

  test('redacts sensitive keys at any depth and keeps readable neighbours', () => {
    const state = {
      account: {
        addressIndex: 3,
        addressType: 'p2wpkh',
        description: 'Savings',
        currentAddress: nativeSegwitAddress,
        stacksDescriptor: `[a1b2c3d4/44'/5757'/0'/0/0]${xpub}`,
        publicKey: '02aa',
        secretKey: 'hunter2',
        password: 'hunter2',
        excludedKeyOrigin: "a1b2c3d4/84'/0'/0'",
        nested: [{ txId: txid, rawTx: { version: 2 }, signedPsbt: 'abc' }],
      },
    };

    expect(redactArg(state)).toEqual({
      account: {
        addressIndex: 3,
        addressType: 'p2wpkh',
        description: 'Savings',
        currentAddress: '[redacted]',
        stacksDescriptor: '[redacted]',
        publicKey: '[redacted]',
        secretKey: '[redacted]',
        password: '[redacted]',
        excludedKeyOrigin: '[redacted]',
        nested: [{ txId: '[redacted]', rawTx: '[redacted]', signedPsbt: '[redacted]' }],
      },
    });
  });

  test('keeps the method and id of a signPsbt request and drops its psbt', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'signPsbt',
      params: { hex: psbtHex, psbt: psbtBase64, signAtIndex: [0, 1], broadcast: false },
    };

    const redacted = redactArg(request);

    expect(redacted).toEqual({
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'signPsbt',
      params: { hex: '[redacted]', psbt: '[redacted]', signAtIndex: [0, 1], broadcast: false },
    });
    expect(JSON.stringify(redacted)).not.toContain(psbtHex);
    expect(JSON.stringify(redacted)).not.toContain(psbtBase64);
  });

  test('redacts an axios-like error and keeps its readable parts', () => {
    const error = Object.assign(new Error('Request failed with status code 400'), {
      isAxiosError: true,
      code: 'ERR_BAD_REQUEST',
      config: {
        method: 'get',
        url: `https://mempool.space/api/address/${nativeSegwitAddress}/utxo`,
        data: psbtHex,
      },
      response: { status: 400, data: `bad-txns-inputs-missingorspent ${txid}` },
    });

    const redacted = redactArg(error);

    expect(redacted).toMatchObject({
      name: 'Error',
      message: 'Request failed with status code 400',
      isAxiosError: true,
      code: 'ERR_BAD_REQUEST',
      config: {
        method: 'get',
        url: 'https://mempool.space/api/address/[address]/utxo',
        data: '[hex]',
      },
      response: { status: 400, data: 'bad-txns-inputs-missingorspent [txid]' },
    });
    expect(redacted).toHaveProperty('stack');
    expect(redacted).not.toBeInstanceOf(Error);
  });

  test('redacts an error cause chain and keeps every message', () => {
    const error = new Error('Broadcast failed', {
      cause: new Error(`Rejected ${txid}`, { cause: { address: nativeSegwitAddress } }),
    });

    expect(redactArg(error)).toMatchObject({
      message: 'Broadcast failed',
      cause: { message: 'Rejected [txid]', cause: { address: '[redacted]' } },
    });
  });

  test('redacts mnemonics, extended keys, WIFs and addresses inside strings', () => {
    expect(redactArg(`restore: ${mnemonic}.`)).toBe('restore: [mnemonic].');
    expect(redactArg(mnemonic.toUpperCase().replaceAll(' ', ', '))).toBe('[mnemonic]');
    expect(redactArg(`key ${xpub}`)).toBe('key [xpub]');
    expect(redactArg(`wif ${wif}`)).toBe('wif [wif]');
    expect(redactArg(`psbt ${psbtBase64}`)).toBe('psbt [psbt]');
    expect(
      redactArg(
        `${nativeSegwitAddress} ${taprootAddress} ${legacyAddress} ${nestedSegwitAddress} ${stacksAddress}`
      )
    ).toBe('[address] [address] [address] [address] [address]');
    expect(redactArg(`${stacksAddress}.sbtc-token`)).toBe('[address].sbtc-token');
    expect(redactArg(`${txid}:1`)).toBe('[txid]:1');
  });

  test('redacts fingerprints in key origins and descriptors', () => {
    expect(redactArg({ origin: "a1b2c3d4/84'/0'/0'", keychainId: "a1b2c3d4/84'/0'/0'" })).toEqual({
      origin: "[redacted]/84'/0'/0'",
      keychainId: '[redacted]',
    });
    expect(redactArg(`wpkh([a1b2c3d4/84'/0'/0']${xpub}/0/*)`)).toBe(
      "wpkh([[redacted]/84'/0'/0'][xpub]/0/*)"
    );
  });

  test('replaces circular references', () => {
    const request: Record<string, unknown> = { method: 'signPsbt' };
    request.self = request;

    expect(redactArg(request)).toEqual({ method: 'signPsbt', self: '[circular]' });
  });

  test('keeps repeated references that are not circular', () => {
    const shared = { fee: 1 };

    expect(redactArg({ first: shared, second: shared })).toEqual({
      first: { fee: 1 },
      second: { fee: 1 },
    });
  });

  test('replaces a value that cannot be read', () => {
    const unreadable = {
      get address() {
        throw new Error('unreadable');
      },
    };

    expect(redactArg(unreadable)).toBe('[redacted]');
  });

  test('converts dates and big numbers', () => {
    expect(
      redactArg({ createdAt: new Date('2026-01-02T03:04:05.000Z'), amount: new BigNumber('1.5') })
    ).toEqual({ createdAt: '2026-01-02T03:04:05.000Z', amount: '1.5' });
  });

  test('does not change the caller input', () => {
    const input = {
      inputs: [{ txid, address: nativeSegwitAddress }],
      note: `sent to ${nativeSegwitAddress}`,
      nested: { address: taprootAddress },
    };
    const snapshot = structuredClone(input);

    redactLogArgs([input]);

    expect(input).toEqual(snapshot);
  });

  test('passes readable values through unchanged', () => {
    const diagnostics = {
      fee: 1000,
      inputCount: 2,
      outputCount: 2,
      totalInputValue: 3000,
      method: 'signPsbt',
    };
    const prose =
      'The wallet could not reach the network because the request timed out after several attempts and gave up';

    expect(
      redactLogArgs([diagnostics, 'plain text', 42, prose, 'networkConfigurationMismatchErr'])
    ).toEqual([diagnostics, 'plain text', 42, prose, 'networkConfigurationMismatchErr']);
  });
});

describe(redactLogMessage.name, () => {
  test('redacts fingerprints next to the word fingerprint', () => {
    expect(redactLogMessage('Successfully migrated Ledger fingerprint: 00000000 → a1b2c3d4')).toBe(
      'Successfully migrated Ledger fingerprint: [redacted] → [redacted]'
    );
  });

  test('redacts values in a message string', () => {
    expect(redactLogMessage(`Broadcast ${txid} from ${nativeSegwitAddress}`)).toBe(
      'Broadcast [txid] from [address]'
    );
  });

  test('stringifies a non-string message after redaction', () => {
    expect(redactLogMessage({ method: 'signPsbt', address: nativeSegwitAddress })).toBe(
      '{"method":"signPsbt","address":"[redacted]"}'
    );
    expect(redactLogMessage(42)).toBe('42');
  });

  test('replaces a message that cannot be stringified', () => {
    expect(redactLogMessage(undefined)).toBe('[redacted]');
  });

  test('passes plain text through unchanged', () => {
    expect(redactLogMessage('plain text')).toBe('plain text');
  });
});
