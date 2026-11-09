import { encodeMessage } from '@stacks/encryption';
import {
  Cl,
  type ClarityValue,
  PostConditionMode,
  makeUnsignedContractCall,
  makeUnsignedSTXTokenTransfer,
  serializeTransactionBytes,
} from '@stacks/transactions';
import { LedgerError } from '@zondax/ledger-stacks';
import { describe, expect, test, vi } from 'vitest';

import { makeFakeLedgerStacksApp } from './ledger-app.mocks';
import {
  signLedgerStacksStructuredMessage,
  signLedgerStacksTransaction,
  signLedgerStacksUtf8Message,
} from './stacks-ledger-utils';

const derivationPath = "m/44'/5757'/0'/0/0";
const publicKey = '029f9d43e161b2ecb86d78262d47d2cd10d20ab7b4c303cd4f0e26744c72e340fc';
const standardPrincipal = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const otherStandardPrincipal = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';
const contractPrincipal = `${standardPrincipal}.vault`;

const encodingError = 'This transaction encoding is not supported with Ledger.';
const postConditionModeError = 'Ledger transactions require Deny post-condition mode.';
const argCountError = 'Ledger contract calls must have fewer than 253 arguments.';
const sip10Error =
  'Ledger contract calls currently support only SIP-10 transfers with exactly four arguments.';
const messageLengthError = 'Ledger messages must be 270 bytes or fewer.';
const controlCharactersError =
  'Ledger messages cannot contain control characters, including tabs and line breaks.';
const structuredLengthError =
  'Ledger structured messages, including their domain, must be 65,535 encoded bytes or fewer.';
const structuredEncodingError = 'This structured message encoding is not supported with Ledger.';

const signResponse = {
  returnCode: LedgerError.NoErrors,
  errorMessage: 'No errors',
  signatureVRS: Buffer.alloc(65, 1),
};

function makeApp() {
  const sign = vi.fn().mockResolvedValue(signResponse);
  const signMsg = vi.fn().mockResolvedValue(signResponse);
  const signStructuredMsg = vi.fn().mockResolvedValue(signResponse);
  const app = makeFakeLedgerStacksApp({
    sign,
    sign_msg: signMsg,
    sign_structured_msg: signStructuredMsg,
  });
  return { app, sign, signMsg, signStructuredMsg };
}

interface ContractCallPayloadParams {
  functionName?: string;
  functionArgs?: ClarityValue[];
  postConditionMode?: PostConditionMode;
}

async function makeContractCallPayload({
  functionName = 'transfer',
  functionArgs = sip10TransferArgs(),
  postConditionMode = PostConditionMode.Deny,
}: ContractCallPayloadParams = {}) {
  const tx = await makeUnsignedContractCall({
    contractAddress: standardPrincipal,
    contractName: 'token',
    functionName,
    functionArgs,
    postConditionMode,
    publicKey,
    network: 'mainnet',
    fee: 1000,
    nonce: 0,
  });
  return Buffer.from(serializeTransactionBytes(tx));
}

function sip10TransferArgs(memo: ClarityValue = Cl.none()) {
  return [
    Cl.uint(100),
    Cl.principal(standardPrincipal),
    Cl.principal(otherStandardPrincipal),
    memo,
  ];
}

async function expectTransactionBlocked(payload: Buffer, error: string) {
  const { app, sign } = makeApp();
  const original = Buffer.from(payload);

  await expect(signLedgerStacksTransaction(app)(payload, derivationPath)).resolves.toEqual({
    error,
  });
  expect(sign).not.toHaveBeenCalled();
  expect(payload.equals(original)).toBe(true);
}

async function expectTransactionSigned(payload: Buffer) {
  const { app, sign } = makeApp();

  await expect(signLedgerStacksTransaction(app)(payload, derivationPath)).resolves.toEqual(
    signResponse
  );
  expect(sign).toHaveBeenCalledOnce();
  expect(sign).toHaveBeenCalledWith(derivationPath, payload);
}

describe(signLedgerStacksTransaction.name, () => {
  test('signs a STX token transfer', async () => {
    const tx = await makeUnsignedSTXTokenTransfer({
      recipient: otherStandardPrincipal,
      amount: 1000,
      publicKey,
      network: 'mainnet',
      fee: 1000,
      nonce: 0,
    });

    await expectTransactionSigned(Buffer.from(serializeTransactionBytes(tx)));
  });

  test('signs a SIP-10 transfer with no memo', async () => {
    await expectTransactionSigned(await makeContractCallPayload());
  });

  test('signs a SIP-10 transfer with a 34-byte memo', async () => {
    await expectTransactionSigned(
      await makeContractCallPayload({
        functionArgs: sip10TransferArgs(Cl.some(Cl.buffer(new Uint8Array(34)))),
      })
    );
  });

  test('signs a SIP-10 transfer between contract principals', async () => {
    await expectTransactionSigned(
      await makeContractCallPayload({
        functionArgs: [
          Cl.uint(100),
          Cl.principal(contractPrincipal),
          Cl.principal(contractPrincipal),
          Cl.none(),
        ],
      })
    );
  });

  test.each([
    ['Allow', PostConditionMode.Allow],
    ['Originator', PostConditionMode.Originator],
  ])('blocks %s post-condition mode', async (_, postConditionMode) => {
    await expectTransactionBlocked(
      await makeContractCallPayload({ postConditionMode }),
      postConditionModeError
    );
  });

  test.each(['approve', 'Transfer', 'transfer-extra'])(
    'blocks a contract call to %s',
    async functionName => {
      await expectTransactionBlocked(await makeContractCallPayload({ functionName }), sip10Error);
    }
  );

  test.each([
    [
      'an int amount',
      [Cl.int(100), Cl.principal(standardPrincipal), Cl.principal(standardPrincipal), Cl.none()],
    ],
    ['a uint sender', [Cl.uint(100), Cl.uint(1), Cl.principal(standardPrincipal), Cl.none()]],
    ['a uint recipient', [Cl.uint(100), Cl.principal(standardPrincipal), Cl.uint(1), Cl.none()]],
    ['a bare buffer memo', sip10TransferArgs(Cl.buffer(new Uint8Array(4)))],
    ['a some(uint) memo', sip10TransferArgs(Cl.some(Cl.uint(1)))],
    ['a 35-byte memo', sip10TransferArgs(Cl.some(Cl.buffer(new Uint8Array(35))))],
    ['three arguments', sip10TransferArgs().slice(0, 3)],
  ])('blocks a transfer with %s', async (_, functionArgs) => {
    await expectTransactionBlocked(await makeContractCallPayload({ functionArgs }), sip10Error);
  });

  test.each([253, 254, 256])('blocks a contract call with %i arguments', async count => {
    await expectTransactionBlocked(
      await makeContractCallPayload({
        functionArgs: Array.from({ length: count }, () => Cl.uint(1)),
      }),
      argCountError
    );
  });

  test('blocks a non-transfer contract call with 252 arguments as unsupported', async () => {
    await expectTransactionBlocked(
      await makeContractCallPayload({
        functionArgs: Array.from({ length: 252 }, () => Cl.uint(1)),
      }),
      sip10Error
    );
  });

  test('blocks a payload that does not parse', async () => {
    await expectTransactionBlocked(Buffer.from('malformed'), encodingError);
  });

  test('blocks a valid transaction followed by a trailing byte', async () => {
    const payload = await makeContractCallPayload();

    await expectTransactionBlocked(Buffer.concat([payload, Buffer.from([0])]), encodingError);
  });
});

describe(signLedgerStacksUtf8Message.name, () => {
  test.each([
    ['270 ASCII bytes', 'a'.repeat(270)],
    ['270 two-byte bytes', 'é'.repeat(135)],
    ['270 bytes of emoji and ASCII', '🙂'.repeat(67) + 'ab'],
  ])('signs the encoded message for %s', async (_, message) => {
    const { app, sign, signMsg } = makeApp();

    await expect(signLedgerStacksUtf8Message(app)(message, derivationPath)).resolves.toEqual(
      signResponse
    );
    expect(signMsg).not.toHaveBeenCalled();
    expect(sign).toHaveBeenCalledOnce();
    expect(sign).toHaveBeenCalledWith(derivationPath, Buffer.from(encodeMessage(message)));
  });

  test.each([
    ['271 ASCII bytes', 'a'.repeat(271)],
    ['271 bytes of two-byte characters', 'é'.repeat(135) + 'a'],
    ['271 bytes of emoji and ASCII', '🙂'.repeat(67) + 'abc'],
  ])('blocks a message of %s', async (_, message) => {
    const { app, sign, signMsg } = makeApp();

    await expect(signLedgerStacksUtf8Message(app)(message, derivationPath)).resolves.toEqual({
      error: messageLengthError,
    });
    expect(sign).not.toHaveBeenCalled();
    expect(signMsg).not.toHaveBeenCalled();
  });

  const controlCharCodes = [
    ...Array.from({ length: 0x20 }, (_, code) => code),
    ...Array.from({ length: 0x9f - 0x7f + 1 }, (_, offset) => 0x7f + offset),
  ];

  test.each(controlCharCodes)('blocks a message containing char code %i', async code => {
    const { app, sign, signMsg } = makeApp();

    await expect(
      signLedgerStacksUtf8Message(app)(`hello${String.fromCharCode(code)}leather`, derivationPath)
    ).resolves.toEqual({ error: controlCharactersError });
    expect(sign).not.toHaveBeenCalled();
    expect(signMsg).not.toHaveBeenCalled();
  });
});

describe(signLedgerStacksStructuredMessage.name, () => {
  const domain = 'aa'.repeat(100);

  test('signs a structured message of exactly 65,535 combined bytes', async () => {
    const { app, signStructuredMsg } = makeApp();
    const payload = 'bb'.repeat(65_435);

    await expect(
      signLedgerStacksStructuredMessage(app)(domain, payload, derivationPath)
    ).resolves.toEqual(signResponse);
    expect(signStructuredMsg).toHaveBeenCalledOnce();
    expect(signStructuredMsg).toHaveBeenCalledWith(derivationPath, domain, payload);
  });

  test.each([
    ['65,536 combined bytes', domain, 'bb'.repeat(65_436)],
    ['70,000 combined bytes', domain, 'bb'.repeat(69_900)],
    ['an oversized domain alone', 'aa'.repeat(65_536), '0c00'],
  ])('blocks %s', async (_, messageDomain, payload) => {
    const { app, signStructuredMsg } = makeApp();

    await expect(
      signLedgerStacksStructuredMessage(app)(messageDomain, payload, derivationPath)
    ).resolves.toEqual({ error: structuredLengthError });
    expect(signStructuredMsg).not.toHaveBeenCalled();
  });

  test.each(['0', 'zz', '00zz', ''])('blocks %j as either part', async malformed => {
    const { app, signStructuredMsg } = makeApp();
    const sign = signLedgerStacksStructuredMessage(app);

    await expect(sign(malformed, '0c00', derivationPath)).resolves.toEqual({
      error: structuredEncodingError,
    });
    await expect(sign(domain, malformed, derivationPath)).resolves.toEqual({
      error: structuredEncodingError,
    });
    expect(signStructuredMsg).not.toHaveBeenCalled();
  });
});
