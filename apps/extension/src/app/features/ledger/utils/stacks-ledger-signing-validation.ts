import {
  ClarityType,
  type ClarityValue,
  PayloadType,
  PostConditionMode,
  type StacksTransactionWire,
  deserializeTransaction,
  serializeTransaction,
} from '@stacks/transactions';

const unsupportedTransactionEncodingError =
  'This transaction encoding is not supported with Ledger.';
const denyPostConditionModeError = 'Ledger transactions require Deny post-condition mode.';
const tooManyContractCallArgsError = 'Ledger contract calls must have fewer than 253 arguments.';
const unsupportedContractCallError =
  'Ledger contract calls currently support only SIP-10 transfers with exactly four arguments.';
const messageTooLongError = 'Ledger messages must be 270 bytes or fewer.';
const messageControlCharactersError =
  'Ledger messages cannot contain control characters, including tabs and line breaks.';
const structuredMessageTooLongError =
  'Ledger structured messages, including their domain, must be 65,535 encoded bytes or fewer.';
const unsupportedStructuredMessageEncodingError =
  'This structured message encoding is not supported with Ledger.';

const maxContractCallArgs = 252;
const sip10TransferFunctionName = 'transfer';
const sip10TransferArgCount = 4;
const maxSip10MemoBytes = 34;
const maxRawMessageBytes = 270;
const maxStructuredMessageBytes = 65_535;
const firstPrintableCharCode = 0x20;
const firstC1ControlCharCode = 0x7f;
const lastC1ControlCharCode = 0x9f;
const evenLengthHexPattern = /^(?:[0-9a-fA-F]{2})+$/;

function deserializeExactTransaction(payload: Buffer): StacksTransactionWire | undefined {
  try {
    const transaction = deserializeTransaction(payload);
    if (serializeTransaction(transaction).toLowerCase() !== payload.toString('hex')) return;
    return transaction;
  } catch {
    return;
  }
}

function isPrincipal(value: ClarityValue) {
  return (
    value.type === ClarityType.PrincipalStandard || value.type === ClarityType.PrincipalContract
  );
}

function isSip10Memo(value: ClarityValue) {
  if (value.type === ClarityType.OptionalNone) return true;
  return (
    value.type === ClarityType.OptionalSome &&
    value.value.type === ClarityType.Buffer &&
    value.value.value.length / 2 <= maxSip10MemoBytes
  );
}

function isSip10TransferCall(functionName: string, functionArgs: ClarityValue[]) {
  if (functionName !== sip10TransferFunctionName) return false;
  if (functionArgs.length !== sip10TransferArgCount) return false;
  const [amount, sender, recipient, memo] = functionArgs;
  return (
    amount.type === ClarityType.UInt &&
    isPrincipal(sender) &&
    isPrincipal(recipient) &&
    isSip10Memo(memo)
  );
}

export function getLedgerStacksTransactionError(payload: Buffer): string | undefined {
  const transaction = deserializeExactTransaction(payload);
  if (!transaction) return unsupportedTransactionEncodingError;

  if (transaction.postConditionMode !== PostConditionMode.Deny) return denyPostConditionModeError;

  const { payload: txPayload } = transaction;
  if (txPayload.payloadType !== PayloadType.ContractCall) return;

  if (txPayload.functionArgs.length > maxContractCallArgs) return tooManyContractCallArgsError;

  if (!isSip10TransferCall(txPayload.functionName.content, txPayload.functionArgs))
    return unsupportedContractCallError;

  return;
}

function isControlCharCode(charCode: number) {
  return (
    charCode < firstPrintableCharCode ||
    (charCode >= firstC1ControlCharCode && charCode <= lastC1ControlCharCode)
  );
}

export function getLedgerStacksRawMessageError(payload: string): string | undefined {
  if (Buffer.byteLength(payload, 'utf8') > maxRawMessageBytes) return messageTooLongError;

  for (const char of payload) {
    const charCode = char.codePointAt(0);
    if (charCode !== undefined && isControlCharCode(charCode)) return messageControlCharactersError;
  }

  return;
}

export function getLedgerStacksStructuredMessageError(
  domain: string,
  payload: string
): string | undefined {
  if ((domain.length + payload.length) / 2 > maxStructuredMessageBytes)
    return structuredMessageTooLongError;

  if (!evenLengthHexPattern.test(domain) || !evenLengthHexPattern.test(payload))
    return unsupportedStructuredMessageEncodingError;

  return;
}
