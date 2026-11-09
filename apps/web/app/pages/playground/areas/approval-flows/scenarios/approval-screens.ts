import type { ApprovalWalletKind } from './approval-scenario.types';

export interface ApprovalScreenEntry {
  id: string;
  familyId: string;
  variantId?: string;
  wallet: ApprovalWalletKind;
  state: 'review' | 'device';
  note: string;
}

function screen(
  id: string,
  familyId: string,
  note: string,
  options: Partial<Pick<ApprovalScreenEntry, 'variantId' | 'wallet' | 'state'>> = {}
): ApprovalScreenEntry {
  return { id, familyId, note, wallet: 'software', state: 'review', ...options };
}

export const approvalScreens: ApprovalScreenEntry[] = [
  screen('connect-first', 'connect', 'First connection: who asks, which account, what they see.'),
  screen('connect-ledger', 'connect', 'Sharing a known Ledger account needs no device signature.', {
    wallet: 'ledger',
  }),
  screen('message-plain', 'message-signing', 'Plain text message.', { variantId: 'plain' }),
  screen('message-structured', 'message-signing', 'Structured SIP-018 data.', {
    variantId: 'structured',
  }),
  screen('message-bip322', 'message-signing', 'Bitcoin BIP-322 sign-in.', { variantId: 'bip322' }),
  screen('send-btc', 'leather-send-swap', 'Leather-built BTC send.', { variantId: 'btc' }),
  screen('send-stx', 'leather-send-swap', 'Leather-built STX send with its post-condition.', {
    variantId: 'stx',
  }),
  screen('send-sbtc', 'leather-send-swap', 'sBTC send paid with an STX fee.', {
    variantId: 'sbtc',
  }),
  screen('send-ledger-device', 'leather-send-swap', 'The Ledger device sheet over a send.', {
    variantId: 'stx',
    wallet: 'ledger',
    state: 'device',
  }),
  screen('swap', 'leather-send-swap', 'Swap with an enforced minimum received.', {
    variantId: 'swap',
  }),
  screen('app-bitcoin-broadcast', 'app-transaction', 'App-built Bitcoin transaction, broadcast.', {
    variantId: 'bitcoin-broadcast',
  }),
  screen('app-stacks-sign-only', 'app-transaction', 'App-built Stacks call, sign only.', {
    variantId: 'stacks-sign-only',
  }),
  screen('psbt-sign-only', 'psbt-signing', 'Partially signed Bitcoin transaction.', {
    variantId: 'sign-only',
  }),
  screen('vault-propose', 'vault-propose', 'Vault funds and the personal signer, apart.', {
    variantId: 'bitcoin',
  }),
  screen('vault-cosign-ledger', 'vault-cosign', 'Co-sign a Stacks vault payment with a Ledger.', {
    variantId: 'stacks',
    wallet: 'ledger',
  }),
  screen('vault-broadcast', 'vault-broadcast', 'Threshold met: broadcast without signing again.', {
    variantId: 'bitcoin',
  }),
  screen('staking-enroll', 'bitcoin-staking-enrollment', 'A lock, not a transfer.'),
  screen('zest-supply', 'zest-supply-withdraw', 'Supply to a lending pool.'),
  screen('zest-borrow', 'zest-borrow-repay', 'Borrow against collateral.'),
  screen('bns-register', 'bns-registration', 'Register a .btc name.'),
  screen('bitflow-swap', 'bitflow-swap', 'App swap with limits on both sides.'),
  screen('stacking', 'stacking', 'Delegate STX to a pool.'),
  screen('end-stacking', 'end-stacking', 'Revoke a delegation.'),
  screen('reward-claim', 'reward-claim', 'Claim BTC rewards.'),
  screen('generic-mint', 'generic-mint', 'Unrecognised call without post-conditions.'),
  screen('generic-vote', 'generic-vote', 'Unrecognised call that moves nothing.'),
  screen('generic-router', 'generic-router', 'Unrecognised multi-asset call.'),
];

export function findApprovalScreen(id: string | null) {
  return approvalScreens.find(entry => entry.id === id) ?? approvalScreens[0];
}
