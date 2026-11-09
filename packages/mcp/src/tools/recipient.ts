import { validateStacksAddress } from '@stacks/transactions';

import { getBnsService } from '@leather.io/services';

import { McpToolError } from './tool-result';

export const bnsNameRegex = /^[a-z0-9-_]+\.[a-z0-9-_]+$/i;
const bitcoinMainnetAddressRegex = /^(bc1[02-9ac-hj-np-z]{11,87}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/;
const stacksMainnetPrefixes = ['SP', 'SM'];

function invalidRecipient(message: string, instructions: string) {
  return new McpToolError('INVALID_INPUT', message, instructions);
}

export function validateBitcoinRecipient(recipient: string) {
  if (bnsNameRegex.test(recipient) && !recipient.startsWith('bc1')) {
    throw invalidRecipient(
      'BNS names can only be used for Stacks sends.',
      'Ask the user for the recipient’s Bitcoin address.'
    );
  }
  if (!bitcoinMainnetAddressRegex.test(recipient)) {
    throw invalidRecipient(
      `${recipient} is not a Bitcoin mainnet address.`,
      'Ask the user to check the recipient address.'
    );
  }
  return recipient;
}

export async function resolveStacksRecipient(recipient: string) {
  const value = recipient.trim();
  const isAddress = validateStacksAddress(value.split('.')[0]);
  if (!isAddress && bnsNameRegex.test(value)) {
    const bnsName = await getBnsService().getBnsName(value.toLowerCase());
    if (!bnsName) {
      throw new McpToolError(
        'NAME_NOT_FOUND',
        `${value} is not a registered BNS name.`,
        'Ask the user to check the name or give a Stacks address instead.'
      );
    }
    return { address: bnsName.owner, name: bnsName.fullName };
  }
  if (!isAddress || !stacksMainnetPrefixes.some(prefix => value.startsWith(prefix))) {
    throw invalidRecipient(
      `${value} is not a Stacks mainnet address or BNS name.`,
      'Ask the user to check the recipient.'
    );
  }
  return { address: value, name: undefined };
}
