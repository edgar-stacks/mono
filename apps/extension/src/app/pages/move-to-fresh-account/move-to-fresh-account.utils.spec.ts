import { STACKS_MAINNET } from '@stacks/network';
import { getAddressFromPublicKey, privateKeyToPublic } from '@stacks/transactions';

import { createMoney } from '@leather.io/utils';

import { buildMovePlan, calculateStxToMove } from './move-to-fresh-account.utils';

const privateKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
const publicKey = String(privateKeyToPublic(privateKey));
const senderAddress = getAddressFromPublicKey(publicKey, 'mainnet');
const recipientAddress = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';

describe(calculateStxToMove.name, () => {
  it('subtracts every fee from the available balance', () => {
    const result = calculateStxToMove(createMoney(1_000_000, 'STX'), [
      createMoney(1_000, 'STX'),
      createMoney(2_000, 'STX'),
      createMoney(3_000, 'STX'),
    ]);
    expect(result.amount.toNumber()).toEqual(994_000);
  });

  it('returns the full balance when there are no fees', () => {
    const result = calculateStxToMove(createMoney(1_000_000, 'STX'), []);
    expect(result.amount.toNumber()).toEqual(1_000_000);
  });

  it('returns zero when the fees use the full balance', () => {
    const result = calculateStxToMove(createMoney(3_000, 'STX'), [
      createMoney(1_000, 'STX'),
      createMoney(2_000, 'STX'),
    ]);
    expect(result.amount.isGreaterThan(0)).toBe(false);
  });

  it('returns a negative value when the fees exceed the balance', () => {
    const result = calculateStxToMove(createMoney(1_000, 'STX'), [createMoney(2_000, 'STX')]);
    expect(result.amount.isGreaterThan(0)).toBe(false);
  });
});

describe(buildMovePlan.name, () => {
  const baseArgs = {
    sender: { address: senderAddress, publicKey },
    recipient: recipientAddress,
    network: STACKS_MAINNET,
    startNonce: 7,
    sip10s: [],
    nfts: [],
    estimateFee() {
      return Promise.resolve(createMoney(500, 'STX'));
    },
  };

  it('sends the available balance minus the fee as the last transaction', async () => {
    const plan = await buildMovePlan({ ...baseArgs, availableStx: createMoney(10_000, 'STX') });
    if (plan.status !== 'ready') throw new Error('Expected a ready plan');
    expect(plan.transactions).toHaveLength(1);
    expect(plan.stxToMove.amount.toNumber()).toEqual(9_500);
    expect(plan.totalFee.amount.toNumber()).toEqual(500);
    expect(plan.transactions[0].tx.auth.spendingCondition.nonce).toEqual(7n);
  });

  it('fails when no STX is left after the fees', async () => {
    const plan = await buildMovePlan({ ...baseArgs, availableStx: createMoney(500, 'STX') });
    expect(plan).toEqual({ status: 'error', message: 'Not enough STX to pay the fees' });
  });
});
