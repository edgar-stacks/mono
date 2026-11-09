import {
  ClarityType,
  type ClarityValue,
  PostConditionMode,
  type StacksTransactionWire,
  deserializeTransaction,
  isContractCallPayload,
} from '@stacks/transactions';

import { isHexString } from '@leather.io/utils';

const maxContractCallArgs = 252;
const sip10TransferFunctionName = 'transfer';
const sip10TransferArgCount = 4;
const maxSip10MemoBytes = 34;
const maxRawMessageBytes = 270;
const maxStructuredMessageBytes = 65_535;
const firstPrintableCharCode = 0x20;
const firstC1ControlCharCode = 0x7f;
const lastC1ControlCharCode = 0x9f;

const unsupportedTransactionEncodingError =
  'This transaction encoding is not supported with Ledger.';
const postConditionModeError = 'Ledger transactions require Deny post-condition mode.';
const contractCallArgCountError = 'Ledger contract calls must have fewer than 253 arguments.';
const unsupportedContractCallError =
  'Ledger contract calls currently support only SIP-10 transfers with exactly four arguments.';
const rawMessageLengthError = 'Ledger messages must be 270 bytes or fewer.';
const rawMessageControlCharacterError =
  'Ledger messages cannot contain control characters, including tabs and line breaks.';
const structuredMessageLengthError =
  'Ledger structured messages, including their domain, must be 65,535 encoded bytes or fewer.';
const unsupportedStructuredMessageEncodingError =
  'This structured message encoding is not supported with Ledger.';

function deserializeExactTransaction(payload: Buffer): StacksTransactionWire | undefined {
  try {
    const transaction = deserializeTransaction(payload.toString('hex'));
    if (transaction.serialize() !== payload.toString('hex')) return;
    return transaction;
  } catch {
    return;
  }
}

function isPrincipalCV(value: ClarityValue) {
  return (
    value.type === ClarityType.PrincipalStandard || value.type === ClarityType.PrincipalContract
  );
}

function isSip10MemoCV(value: ClarityValue) {
  if (value.type === ClarityType.OptionalNone) return true;
  if (value.type !== ClarityType.OptionalSome) return false;
  return (
    value.value.type === ClarityType.Buffer &&
    Buffer.from(value.value.value, 'hex').length <= maxSip10MemoBytes
  );
}

function isSip10TransferArgs(args: ClarityValue[]) {
  if (args.length !== sip10TransferArgCount) return false;
  const [amount, sender, recipient, memo] = args;
  return (
    amount.type === ClarityType.UInt &&
    isPrincipalCV(sender) &&
    isPrincipalCV(recipient) &&
    isSip10MemoCV(memo)
  );
}

export function getLedgerStacksTransactionError(payload: Buffer): string | undefined {
  const transaction = deserializeExactTransaction(payload);
  if (!transaction) return unsupportedTransactionEncodingError;

  if (transaction.postConditionMode !== PostConditionMode.Deny) return postConditionModeError;

  if (!isContractCallPayload(transaction.payload)) return;

  const { functionName, functionArgs } = transaction.payload;
  if (functionArgs.length > maxContractCallArgs) return contractCallArgCountError;

  if (functionName.content !== sip10TransferFunctionName || !isSip10TransferArgs(functionArgs))
    return unsupportedContractCallError;

  return;
}

function isControlCharacter(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return (
    code < firstPrintableCharCode ||
    (code >= firstC1ControlCharCode && code <= lastC1ControlCharCode)
  );
}

export function getLedgerStacksRawMessageError(payload: string): string | undefined {
  if (Buffer.byteLength(payload, 'utf8') > maxRawMessageBytes) return rawMessageLengthError;
  if (Array.from(payload).some(isControlCharacter)) return rawMessageControlCharacterError;
  return;
}

function isEvenLengthHex(value: string) {
  return value.length % 2 === 0 && isHexString(value);
}

export function getLedgerStacksStructuredMessageError(
  domain: string,
  payload: string
): string | undefined {
  if ((domain.length + payload.length) / 2 > maxStructuredMessageBytes)
    return structuredMessageLengthError;
  if (!isEvenLengthHex(domain) || !isEvenLengthHex(payload))
    return unsupportedStructuredMessageEncodingError;
  return;
}
