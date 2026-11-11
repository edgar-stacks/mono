import {
  ClarityType,
  type ClarityValue,
  PayloadType,
  PostConditionMode,
  type StacksTransactionWire,
  deserializeTransaction,
} from '@stacks/transactions';

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

const unsupportedTransactionEncodingError =
  'This transaction encoding is not supported with Ledger.';
const postConditionModeError = 'Ledger transactions require Deny post-condition mode.';
const contractCallArgCountError = 'Ledger contract calls must have fewer than 253 arguments.';
const unsupportedContractCallError =
  'Ledger contract calls currently support only SIP-10 transfers with exactly four arguments.';
const rawMessageSizeError = 'Ledger messages must be 270 bytes or fewer.';
const rawMessageControlCharacterError =
  'Ledger messages cannot contain control characters, including tabs and line breaks.';
const structuredMessageSizeError =
  'Ledger structured messages, including their domain, must be 65,535 encoded bytes or fewer.';
const unsupportedStructuredMessageEncodingError =
  'This structured message encoding is not supported with Ledger.';

function deserializeExactTransaction(payload: Buffer): StacksTransactionWire | undefined {
  try {
    const payloadHex = payload.toString('hex');
    const transaction = deserializeTransaction(payloadHex);
    return transaction.serialize() === payloadHex ? transaction : undefined;
  } catch {
    return undefined;
  }
}

function isPrincipal(value: ClarityValue) {
  return (
    value.type === ClarityType.PrincipalStandard || value.type === ClarityType.PrincipalContract
  );
}

function isSip10Memo(value: ClarityValue) {
  if (value.type === ClarityType.OptionalNone) return true;
  if (value.type !== ClarityType.OptionalSome) return false;
  const memo = value.value;
  return memo.type === ClarityType.Buffer && memo.value.length / 2 <= maxSip10MemoBytes;
}

function isSip10Transfer(functionName: string, functionArgs: ClarityValue[]) {
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

  if (transaction.postConditionMode !== PostConditionMode.Deny) return postConditionModeError;

  if (transaction.payload.payloadType !== PayloadType.ContractCall) return undefined;

  const { functionName, functionArgs } = transaction.payload;
  if (functionArgs.length > maxContractCallArgs) return contractCallArgCountError;
  if (!isSip10Transfer(functionName.content, functionArgs)) return unsupportedContractCallError;

  return undefined;
}

function isControlCharCode(charCode: number) {
  return (
    charCode < firstPrintableCharCode ||
    (charCode >= firstC1ControlCharCode && charCode <= lastC1ControlCharCode)
  );
}

export function getLedgerStacksRawMessageError(payload: string): string | undefined {
  if (Buffer.byteLength(payload, 'utf8') > maxRawMessageBytes) return rawMessageSizeError;

  const hasControlCharacter = Array.from(payload).some(char => {
    const charCode = char.codePointAt(0);
    return charCode !== undefined && isControlCharCode(charCode);
  });
  if (hasControlCharacter) return rawMessageControlCharacterError;

  return undefined;
}

export function getLedgerStacksStructuredMessageError(
  domain: string,
  payload: string
): string | undefined {
  if ((domain.length + payload.length) / 2 > maxStructuredMessageBytes)
    return structuredMessageSizeError;

  if (!evenLengthHexPattern.test(domain) || !evenLengthHexPattern.test(payload))
    return unsupportedStructuredMessageEncodingError;

  return undefined;
}
