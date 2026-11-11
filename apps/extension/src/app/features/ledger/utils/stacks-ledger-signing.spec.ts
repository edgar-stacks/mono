import { encodeMessage } from '@stacks/encryption';
import {
  type ClarityValue,
  PostConditionMode,
  bufferCV,
  contractPrincipalCV,
  intCV,
  makeUnsignedContractCall,
  makeUnsignedSTXTokenTransfer,
  noneCV,
  someCV,
  standardPrincipalCV,
  uintCV,
} from '@stacks/transactions';
import { LedgerError } from '@zondax/ledger-stacks';

import { makeFakeLedgerStacksApp } from './ledger-app.mocks';
import {
  signLedgerStacksStructuredMessage,
  signLedgerStacksTransaction,
  signLedgerStacksUtf8Message,
} from './stacks-ledger-utils';

const derivationPath = "m/44'/5757'/0'/0/0";
const publicKey = '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893';
const sender = 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB';
const recipient = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const contractAddress = 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9';
const contractName = 'token';
const deviceResponse = {
  returnCode: LedgerError.NoErrors,
  errorMessage: 'No errors',
  signatureVRS: Buffer.alloc(65, 1),
};

const encodingError = 'This transaction encoding is not supported with Ledger.';
const postConditionModeError = 'Ledger transactions require Deny post-condition mode.';
const argCountError = 'Ledger contract calls must have fewer than 253 arguments.';
const sip10Error =
  'Ledger contract calls currently support only SIP-10 transfers with exactly four arguments.';
const messageSizeError = 'Ledger messages must be 270 bytes or fewer.';
const controlCharacterError =
  'Ledger messages cannot contain control characters, including tabs and line breaks.';
const structuredSizeError =
  'Ledger structured messages, including their domain, must be 65,535 encoded bytes or fewer.';
const structuredEncodingError = 'This structured message encoding is not supported with Ledger.';

function makeFakeApp() {
  const sign = vi.fn().mockResolvedValue(deviceResponse);
  const signMsg = vi.fn().mockResolvedValue(deviceResponse);
  const signStructuredMsg = vi.fn().mockResolvedValue(deviceResponse);
  const stacksApp = makeFakeLedgerStacksApp({
    sign,
    sign_msg: signMsg,
    sign_structured_msg: signStructuredMsg,
  });
  return { stacksApp, sign, signMsg, signStructuredMsg };
}

interface MakeContractCallParams {
  functionName?: string;
  functionArgs: ClarityValue[];
  postConditionMode?: PostConditionMode;
}

async function makeContractCallPayload({
  functionName = 'transfer',
  functionArgs,
  postConditionMode = PostConditionMode.Deny,
}: MakeContractCallParams) {
  const tx = await makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    postConditionMode,
    fee: 100,
    nonce: 0,
    network: 'mainnet',
    publicKey,
  });
  return Buffer.from(tx.serialize(), 'hex');
}

function sip10TransferArgs(memo: ClarityValue = noneCV()) {
  return [uintCV(100), standardPrincipalCV(sender), standardPrincipalCV(recipient), memo];
}

async function expectTransactionBlocked(payload: Buffer, error: string) {
  const { stacksApp, sign } = makeFakeApp();
  const original = Buffer.from(payload);

  await expect(signLedgerStacksTransaction(stacksApp)(payload, derivationPath)).resolves.toEqual({
    error,
  });
  expect(sign).not.toHaveBeenCalled();
  expect(payload.equals(original)).toBe(true);
}

async function expectTransactionSigned(payload: Buffer) {
  const { stacksApp, sign } = makeFakeApp();

  await expect(signLedgerStacksTransaction(stacksApp)(payload, derivationPath)).resolves.toEqual(
    deviceResponse
  );
  expect(sign).toHaveBeenCalledOnce();
  expect(sign).toHaveBeenCalledWith(derivationPath, payload);
}

describe(signLedgerStacksTransaction.name, () => {
  test('signs an STX transfer in Deny mode', async () => {
    const tx = await makeUnsignedSTXTokenTransfer({
      recipient,
      amount: 500,
      fee: 100,
      nonce: 0,
      network: 'mainnet',
      publicKey,
    });
    await expectTransactionSigned(Buffer.from(tx.serialize(), 'hex'));
  });

  test.each([
    ['Allow', PostConditionMode.Allow],
    ['Originator', PostConditionMode.Originator],
  ])('blocks %s post-condition mode', async (_, postConditionMode) => {
    const payload = await makeContractCallPayload({
      functionArgs: sip10TransferArgs(),
      postConditionMode,
    });
    await expectTransactionBlocked(payload, postConditionModeError);
  });

  test('blocks an STX transfer in Allow mode', async () => {
    const tx = await makeUnsignedSTXTokenTransfer({
      recipient,
      amount: 500,
      fee: 100,
      nonce: 0,
      network: 'mainnet',
      publicKey,
    });
    tx.postConditionMode = PostConditionMode.Allow;
    await expectTransactionBlocked(Buffer.from(tx.serialize(), 'hex'), postConditionModeError);
  });

  test('signs a SIP-10 transfer with a none memo', async () => {
    await expectTransactionSigned(
      await makeContractCallPayload({ functionArgs: sip10TransferArgs() })
    );
  });

  test('signs a SIP-10 transfer with a 34-byte memo', async () => {
    await expectTransactionSigned(
      await makeContractCallPayload({
        functionArgs: sip10TransferArgs(someCV(bufferCV(new Uint8Array(34)))),
      })
    );
  });

  test('signs a SIP-10 transfer with contract principals', async () => {
    await expectTransactionSigned(
      await makeContractCallPayload({
        functionArgs: [
          uintCV(1),
          contractPrincipalCV(sender, 'vault'),
          contractPrincipalCV(recipient, 'vault'),
          noneCV(),
        ],
      })
    );
  });

  test.each(['approve', 'Transfer', 'transfer-extra'])(
    'blocks the %s function',
    async functionName => {
      const payload = await makeContractCallPayload({
        functionName,
        functionArgs: sip10TransferArgs(),
      });
      await expectTransactionBlocked(payload, sip10Error);
    }
  );

  test.each([
    [
      'int amount',
      [intCV(100), standardPrincipalCV(sender), standardPrincipalCV(recipient), noneCV()],
    ],
    ['uint sender', [uintCV(100), uintCV(1), standardPrincipalCV(recipient), noneCV()]],
    ['uint recipient', [uintCV(100), standardPrincipalCV(sender), uintCV(1), noneCV()]],
    ['bare buffer memo', sip10TransferArgs(bufferCV(new Uint8Array(4)))],
    ['some(uint) memo', sip10TransferArgs(someCV(uintCV(1)))],
    ['35-byte memo', sip10TransferArgs(someCV(bufferCV(new Uint8Array(35))))],
    ['three arguments', sip10TransferArgs().slice(0, 3)],
  ])('blocks a transfer with %s', async (_, functionArgs) => {
    const payload = await makeContractCallPayload({ functionArgs });
    await expectTransactionBlocked(payload, sip10Error);
  });

  test.each([253, 254, 256])('blocks a contract call with %i arguments', async argCount => {
    const payload = await makeContractCallPayload({
      functionArgs: Array.from({ length: argCount }, () => uintCV(1)),
    });
    await expectTransactionBlocked(payload, argCountError);
  });

  test('blocks a contract call with 252 arguments as an unsupported call', async () => {
    const payload = await makeContractCallPayload({
      functionArgs: Array.from({ length: 252 }, () => uintCV(1)),
    });
    await expectTransactionBlocked(payload, sip10Error);
  });

  test('blocks a malformed payload', async () => {
    await expectTransactionBlocked(Buffer.from('malformed'), encodingError);
  });

  test('blocks a valid transaction followed by a trailing byte', async () => {
    const payload = await makeContractCallPayload({ functionArgs: sip10TransferArgs() });
    await expectTransactionBlocked(Buffer.concat([payload, Buffer.from([0])]), encodingError);
  });
});

const c1ControlCharCodes = Array.from({ length: 0x9f - 0x7f + 1 }, (_, i) => 0x7f + i);
const c0ControlCharCodes = Array.from({ length: 0x20 }, (_, i) => i);

describe(signLedgerStacksUtf8Message.name, () => {
  test.each(['a'.repeat(270), 'é'.repeat(135), '🙂'.repeat(67) + 'ab'])(
    'signs the encoded message of 270 bytes',
    async message => {
      const { stacksApp, sign, signMsg } = makeFakeApp();

      await expect(
        signLedgerStacksUtf8Message(stacksApp)(message, derivationPath)
      ).resolves.toEqual(deviceResponse);
      expect(sign).toHaveBeenCalledOnce();
      expect(sign).toHaveBeenCalledWith(derivationPath, Buffer.from(encodeMessage(message)));
      expect(signMsg).not.toHaveBeenCalled();
    }
  );

  test.each(['a'.repeat(271), 'é'.repeat(135) + 'a', '🙂'.repeat(67) + 'abc'])(
    'blocks a message over 270 bytes',
    async message => {
      const { stacksApp, sign, signMsg } = makeFakeApp();

      await expect(
        signLedgerStacksUtf8Message(stacksApp)(message, derivationPath)
      ).resolves.toEqual({ error: messageSizeError });
      expect(sign).not.toHaveBeenCalled();
      expect(signMsg).not.toHaveBeenCalled();
    }
  );

  test.each([...c0ControlCharCodes, ...c1ControlCharCodes])(
    'blocks a message containing char code %i',
    async charCode => {
      const { stacksApp, sign, signMsg } = makeFakeApp();
      const message = `hello${String.fromCharCode(charCode)}leather`;

      await expect(
        signLedgerStacksUtf8Message(stacksApp)(message, derivationPath)
      ).resolves.toEqual({ error: controlCharacterError });
      expect(sign).not.toHaveBeenCalled();
      expect(signMsg).not.toHaveBeenCalled();
    }
  );
});

describe(signLedgerStacksStructuredMessage.name, () => {
  const domain = '0c'.repeat(10);

  test('signs a structured message of exactly 65,535 combined bytes', async () => {
    const { stacksApp, signStructuredMsg } = makeFakeApp();
    const payload = 'ab'.repeat(65_535 - domain.length / 2);

    await expect(
      signLedgerStacksStructuredMessage(stacksApp)(domain, payload, derivationPath)
    ).resolves.toEqual(deviceResponse);
    expect(signStructuredMsg).toHaveBeenCalledOnce();
    expect(signStructuredMsg).toHaveBeenCalledWith(derivationPath, domain, payload);
  });

  test.each([
    ['65,536 combined bytes', domain, 'ab'.repeat(65_536 - domain.length / 2)],
    ['70,000 combined bytes', domain, 'ab'.repeat(70_000 - domain.length / 2)],
    ['an oversized domain alone', '0c'.repeat(65_536), 'ab'],
  ])('blocks %s', async (_, messageDomain, payload) => {
    const { stacksApp, signStructuredMsg } = makeFakeApp();

    await expect(
      signLedgerStacksStructuredMessage(stacksApp)(messageDomain, payload, derivationPath)
    ).resolves.toEqual({ error: structuredSizeError });
    expect(signStructuredMsg).not.toHaveBeenCalled();
  });

  test.each(['0', 'zz', '00zz', ''])('blocks %j as the domain or the message', async invalid => {
    const { stacksApp, signStructuredMsg } = makeFakeApp();
    const sign = signLedgerStacksStructuredMessage(stacksApp);

    await expect(sign(invalid, 'ab', derivationPath)).resolves.toEqual({
      error: structuredEncodingError,
    });
    await expect(sign(domain, invalid, derivationPath)).resolves.toEqual({
      error: structuredEncodingError,
    });
    expect(signStructuredMsg).not.toHaveBeenCalled();
  });
});
