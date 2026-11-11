import type { ApprovalRequest, MessageFormat, SignerKind } from './approval-model';
import { requesters, signerFor } from './scenario-fixtures';

export const messageFormats: { id: MessageFormat; label: string }[] = [
  { id: 'utf8', label: 'Plain text' },
  { id: 'structured', label: 'Structured (SIP-018)' },
  { id: 'bip322', label: 'Bitcoin (BIP-322)' },
];

const plainMessage =
  'Sign in to Gamma\n\nThis request will not trigger a blockchain transaction or cost any fees.\n\nNonce: 8f3a91c2';

const structuredMessage = JSON.stringify(
  {
    action: 'list-for-sale',
    collection: 'bitcoin-monkeys',
    tokenId: 4021,
    price: '250000000 uSTX',
    expiresAt: 'block 182400',
  },
  null,
  2
);

const bitcoinMessage = 'gamma.io wants you to prove ownership of this address. Nonce: 8f3a91c2';

export function messageRequest(kind: SignerKind, format: MessageFormat): ApprovalRequest {
  const chain = format === 'bip322' ? 'bitcoin' : 'stacks';
  return {
    kind: 'message',
    method: format === 'bip322' ? 'signMessage' : 'stx_signMessage',
    title: 'Sign message',
    chain,
    delivery: 'sign-only',
    requester: requesters.gamma,
    signer: signerFor(kind, chain),
    movements: [],
    message: {
      format,
      content: messageContent(format),
      domain: format === 'structured' ? 'Gamma Marketplace · v1 · mainnet' : undefined,
    },
    notices:
      format === 'structured'
        ? [
            {
              tone: 'warning',
              text: 'Structured messages can authorize actions in the app, such as listing an item for sale.',
            },
          ]
        : [],
    afterApproval: 'The signature goes back to Gamma. Nothing is broadcast and no fee is charged.',
  };
}

function messageContent(format: MessageFormat) {
  if (format === 'structured') return structuredMessage;
  if (format === 'bip322') return bitcoinMessage;
  return plainMessage;
}
