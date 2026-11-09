import BigNumber from 'bignumber.js';
import { describe, expect, test } from 'vitest';

import { redactLogArgs, redactLogMessage } from './logger-redaction';

const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const bech32Address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const wif = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const xpub =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const publicKey = '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';
const psbtBase64 = 'cHNidP8BAHECAAAAAeJQY2VLRtutKgQYFUajEKpjFfl0Uyrm6x23OumDpe/4AQAAAAD/////';
const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function redactArg(arg: unknown) {
  return redactLogArgs([arg])[0];
}

describe(redactLogArgs.name, () => {
  test('summarises sensitive arrays and keeps counts readable', () => {
    expect(
      redactArg({
        inputs: [
          { txid, vout: 0, value: 1000, address: bech32Address },
          { txid, vout: 1, value: 2000, address: bech32Address },
        ],
        outputs: [
          { address: bech32Address, value: 1500 },
          { address: legacyAddress, value: 500 },
        ],
        fee: 1000,
        inputCount: 2,
      })
    ).toEqual({ inputs: '[2 items]', outputs: '[2 items]', fee: 1000, inputCount: 2 });

    expect(redactArg({ utxos: [1, 2, 3], outpoints: ['a', 'b'] })).toEqual({
      utxos: '[3 items]',
      outpoints: '[2 items]',
    });
  });

  test('redacts sensitive keys in nested objects', () => {
    expect(
      redactArg({
        account: {
          addressIndex: 0,
          addressType: 'p2wpkh',
          description: 'Main account',
          recipientAddress: stacksAddress,
          stxPublicKey: publicKey,
          currentAccountStacksDescriptor: `[a1b2c3d4/44'/5757'/0'/0/0]${publicKey}`,
          keys: [{ xpub, masterFingerprint: 'a1b2c3d4', txId: txid }],
          empty: { address: null, policy: undefined },
        },
      })
    ).toEqual({
      account: {
        addressIndex: 0,
        addressType: 'p2wpkh',
        description: 'Main account',
        recipientAddress: '[redacted]',
        stxPublicKey: '[redacted]',
        currentAccountStacksDescriptor: '[redacted]',
        keys: [{ xpub: '[redacted]', masterFingerprint: '[redacted]', txId: '[redacted]' }],
        empty: { address: null, policy: undefined },
      },
    });
  });

  test('keeps the method and id of a signPsbt request', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'signPsbt',
      params: { hex: '70736274ff01007102000000', psbt: psbtBase64, broadcast: false },
    };

    expect(redactArg(request)).toEqual({
      jsonrpc: '2.0',
      id: 'req-1',
      method: 'signPsbt',
      params: { hex: '[redacted]', psbt: '[redacted]', broadcast: false },
    });
  });

  test('scans string values for sensitive identifiers', () => {
    expect(
      redactArg({
        notes: [
          `Broadcast ${txid}`,
          `Spending ${txid}:1`,
          `Sending to ${bech32Address}`,
          `https://api.hiro.so/extended/v1/address/${stacksAddress}/balances`,
          `Legacy ${legacyAddress}`,
          `Key ${wif}`,
          `Extended ${xpub}`,
          `Payload ${psbtBase64}`,
        ],
      })
    ).toEqual({
      notes: [
        'Broadcast [redacted]',
        'Spending [redacted]',
        'Sending to [redacted]',
        'https://api.hiro.so/extended/v1/address/[redacted]/balances',
        'Legacy [redacted]',
        'Key [redacted]',
        'Extended [redacted]',
        'Payload [redacted]',
      ],
    });
  });

  test('redacts fingerprints in key origins', () => {
    expect(redactArg({ origin: "a1b2c3d4/84'/0'/0'", keychainId: "a1b2c3d4/84'/0'/0'" })).toEqual({
      origin: "[redacted]/84'/0'/0'",
      keychainId: '[redacted]',
    });
  });

  test('redacts mnemonics separated by spaces or commas in any case', () => {
    expect(redactArg(`Restored ${mnemonic} from backup`)).toEqual(
      'Restored [redacted] from backup'
    );
    expect(redactArg(mnemonic.toUpperCase().split(' ').join(', '))).toEqual('[redacted]');
  });

  test('keeps error details while redacting their contents', () => {
    const error = new Error('Broadcast failed', {
      cause: new Error(`Rejected ${txid}`, { cause: { address: bech32Address, code: 26 } }),
    });

    const result = redactArg(error);

    expect(result).toMatchObject({
      name: 'Error',
      message: 'Broadcast failed',
      cause: {
        name: 'Error',
        message: 'Rejected [redacted]',
        cause: { address: '[redacted]', code: 26 },
      },
    });
    expect(JSON.stringify(result)).not.toContain(txid);
    expect(JSON.stringify(result)).not.toContain(bech32Address);
  });

  test('keeps an axios-like error readable', () => {
    const error = Object.assign(new Error('Request failed with status code 404'), {
      name: 'AxiosError',
      code: 'ERR_BAD_REQUEST',
      isAxiosError: true,
      config: {
        method: 'get',
        url: `https://api.hiro.so/extended/v1/address/${stacksAddress}/balances`,
      },
      response: { status: 404, data: { error: `No account found for ${stacksAddress}` } },
    });

    expect(redactArg(error)).toMatchObject({
      name: 'AxiosError',
      message: 'Request failed with status code 404',
      code: 'ERR_BAD_REQUEST',
      isAxiosError: true,
      config: {
        method: 'get',
        url: 'https://api.hiro.so/extended/v1/address/[redacted]/balances',
      },
      response: { status: 404, data: { error: 'No account found for [redacted]' } },
    });
  });

  test('converts dates and big numbers to strings', () => {
    expect(
      redactArg({ createdOn: new Date('2026-01-01T00:00:00.000Z'), amount: new BigNumber(42) })
    ).toEqual({ createdOn: '2026-01-01T00:00:00.000Z', amount: '42' });
  });

  test('redacts a value that cannot be read', () => {
    const unreadable = {
      get address() {
        throw new Error('Unreadable');
      },
    };

    expect(redactArg(unreadable)).toEqual('[redacted]');
  });

  test('marks circular references', () => {
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

  test('does not change the caller input', () => {
    const input = {
      inputs: [{ txid, address: bech32Address }],
      nested: { message: `Sent to ${bech32Address}` },
    };
    const snapshot = structuredClone(input);

    const result = redactArg(input);

    expect(input).toEqual(snapshot);
    expect(result).not.toBe(input);
  });

  test('passes readable diagnostics through unchanged', () => {
    const diagnostics = { fee: 1000, inputCount: 2, outputCount: 1, totalInputValue: 3000 };
    const sentence =
      'The wallet could not reach the network because the request timed out after several retries, please try again later';

    expect(redactLogArgs([{ ...diagnostics, method: 'signPsbt' }, 'plain text', 42])).toEqual([
      { ...diagnostics, method: 'signPsbt' },
      'plain text',
      42,
    ]);
    expect(redactArg(sentence)).toEqual(sentence);
    expect(redactArg('networkConfigurationMismatchErr')).toEqual('networkConfigurationMismatchErr');
  });
});

describe(redactLogMessage.name, () => {
  test('redacts fingerprints next to the word fingerprint', () => {
    expect(
      redactLogMessage('Successfully migrated Ledger fingerprint: 00000000 → a1b2c3d4')
    ).toEqual('Successfully migrated Ledger fingerprint: [redacted] → [redacted]');
  });

  test('keeps ordinary messages unchanged', () => {
    expect(redactLogMessage('Received RPC request signPsbt')).toEqual(
      'Received RPC request signPsbt'
    );
  });

  test('stringifies a non-string message after redaction', () => {
    expect(redactLogMessage({ method: 'signPsbt', address: bech32Address })).toEqual(
      '{"method":"signPsbt","address":"[redacted]"}'
    );
    expect(redactLogMessage(42)).toEqual('42');
  });

  test('redacts a message that cannot be stringified', () => {
    expect(redactLogMessage(undefined)).toEqual('[redacted]');
  });
});
