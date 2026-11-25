import { STACKS_MAINNET } from '@stacks/network';
import {
  type StacksTransactionWire,
  getAddressFromPrivateKey,
  privateKeyToPublic,
  randomPrivateKey,
} from '@stacks/transactions';
import { describe, expect, test, vi } from 'vitest';

import type { Money } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import {
  type MoveTransferContext,
  broadcastInOrder,
  buildMovePlan,
  calculateStxToMove,
  createUnsignedMoveTransactions,
  notEnoughStxForFeesMessage,
} from './move-to-fresh-account.utils';

function createTransferContext(): MoveTransferContext {
  const senderKey = randomPrivateKey();
  return {
    publicKey: String(privateKeyToPublic(senderKey)),
    senderAddress: getAddressFromPrivateKey(senderKey, STACKS_MAINNET),
    recipient: getAddressFromPrivateKey(randomPrivateKey(), STACKS_MAINNET),
    network: STACKS_MAINNET,
  };
}

const sip10 = {
  assetId: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token',
  symbol: 'sBTC',
  amount: createMoney(1000, 'sBTC', 8),
};

const nft = {
  assetIdentifier: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2::BNS-V2',
  hex: '0x010000000000000000000000000000002a',
  name: 'leather.btc',
};

describe(calculateStxToMove.name, () => {
  test('subtracts every fee from the available balance', () => {
    const stxToMove = calculateStxToMove(createMoney(1_000_000, 'STX'), [
      createMoney(1_000, 'STX'),
      createMoney(2_000, 'STX'),
      createMoney(3_000, 'STX'),
    ]);

    expect(stxToMove).toEqual(createMoney(994_000, 'STX'));
  });

  test('returns the available balance when there are no fees', () => {
    expect(calculateStxToMove(createMoney(500, 'STX'), [])).toEqual(createMoney(500, 'STX'));
  });

  test('returns zero when the fees use the full balance', () => {
    const stxToMove = calculateStxToMove(createMoney(3_000, 'STX'), [
      createMoney(1_000, 'STX'),
      createMoney(2_000, 'STX'),
    ]);

    expect(stxToMove.amount.isGreaterThan(0)).toBe(false);
  });

  test('returns a negative value when the fees exceed the balance', () => {
    const stxToMove = calculateStxToMove(createMoney(1_000, 'STX'), [createMoney(2_000, 'STX')]);

    expect(stxToMove.amount.isNegative()).toBe(true);
  });
});

describe(buildMovePlan.name, () => {
  const estimateFee = vi
    .fn<(unsignedTx: StacksTransactionWire) => Promise<Money>>()
    .mockResolvedValue(createMoney(1_000, 'STX'));

  test('orders tokens and NFTs before STX with sequential nonces from the next nonce', async () => {
    const result = await buildMovePlan({
      context: createTransferContext(),
      nonce: 7,
      availableStx: createMoney(100_000, 'STX'),
      sip10s: [sip10],
      nfts: [nft],
      estimateFee,
    });

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.plan.transfers.map(({ kind, nonce }) => ({ kind, nonce }))).toEqual([
      { kind: 'sip10', nonce: 7 },
      { kind: 'nft', nonce: 8 },
      { kind: 'stx', nonce: 9 },
    ]);
    expect(result.plan.totalFee).toEqual(createMoney(3_000, 'STX'));
    expect(result.plan.stxToMove).toEqual(createMoney(97_000, 'STX'));
  });

  test('fails when the STX left after fees is not positive', async () => {
    const result = await buildMovePlan({
      context: createTransferContext(),
      nonce: 0,
      availableStx: createMoney(2_000, 'STX'),
      sip10s: [sip10],
      nfts: [],
      estimateFee,
    });

    expect(result).toEqual({ kind: 'error', message: notEnoughStxForFeesMessage });
  });
});

describe(createUnsignedMoveTransactions.name, () => {
  test('builds each transaction with its planned nonce and fee', async () => {
    const context = createTransferContext();
    const result = await buildMovePlan({
      context,
      nonce: 3,
      availableStx: createMoney(100_000, 'STX'),
      sip10s: [sip10],
      nfts: [nft],
      estimateFee: () => Promise.resolve(createMoney(1_500, 'STX')),
    });
    if (result.kind !== 'ready') throw new Error('Expected a ready plan');

    const unsignedTxs = await createUnsignedMoveTransactions(context, result.plan);

    expect(
      unsignedTxs.map(tx => [tx.auth.spendingCondition.nonce, tx.auth.spendingCondition.fee])
    ).toEqual([
      [3n, 1500n],
      [4n, 1500n],
      [5n, 1500n],
    ]);
    expect(unsignedTxs.slice(0, 2).map(tx => tx.postConditions.values.length)).toEqual([1, 1]);
  });
});

describe(broadcastInOrder.name, () => {
  const signedTxs = ['tx-a', 'tx-b', 'tx-c'];

  test('broadcasts every transaction in order', async () => {
    const broadcast = vi.fn<(signedTx: string) => Promise<void>>().mockResolvedValue(undefined);

    expect(await broadcastInOrder(signedTxs, broadcast)).toEqual({ sent: 3 });
    expect(broadcast.mock.calls.map(([tx]) => tx)).toEqual(signedTxs);
  });

  test('stops at the first failure', async () => {
    const broadcast = vi
      .fn<(signedTx: string) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('ConflictingNonceInMempool'));

    expect(await broadcastInOrder(signedTxs, broadcast)).toEqual({
      sent: 1,
      error: 'ConflictingNonceInMempool',
    });
    expect(broadcast).toHaveBeenCalledTimes(2);
  });
});
