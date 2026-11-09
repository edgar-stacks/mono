import { STACKS_MAINNET } from '@stacks/network';
import {
  cvToHex,
  makeRandomPrivKey,
  privateKeyToAddress,
  privateKeyToPublic,
  uintCV,
} from '@stacks/transactions';

import { createMoney } from '@leather.io/utils';

import { buildMovePlan, calculateStxToMove } from './move-to-fresh-account.utils';

const senderPrivateKey = makeRandomPrivKey();
const sender = {
  address: privateKeyToAddress(senderPrivateKey, 'mainnet'),
  publicKey: String(privateKeyToPublic(senderPrivateKey)),
};
const recipient = privateKeyToAddress(makeRandomPrivKey(), 'mainnet');
const token = {
  assetId: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-alex::alex',
  symbol: 'ALEX',
  amount: createMoney(5000, 'ALEX', 8),
};
const nft = {
  assetIdentifier: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2::BNS-V2',
  tokenHex: cvToHex(uintCV(42)),
  name: 'BNS-V2 #42',
};

describe(calculateStxToMove.name, () => {
  it('subtracts every fee from the available balance', () => {
    const fees = [createMoney(1000, 'STX'), createMoney(2000, 'STX'), createMoney(3000, 'STX')];
    expect(calculateStxToMove(createMoney(1_000_000, 'STX'), fees).amount.toNumber()).toEqual(
      994_000
    );
  });

  it('returns a non-positive value when the fees use the full balance', () => {
    const fees = [createMoney(4000, 'STX'), createMoney(6000, 'STX')];
    expect(calculateStxToMove(createMoney(10_000, 'STX'), fees).amount.toNumber()).toEqual(0);
    expect(calculateStxToMove(createMoney(9000, 'STX'), fees).amount.isGreaterThan(0)).toBeFalsy();
  });
});

describe(buildMovePlan.name, () => {
  const estimateFee = vi.fn(() => Promise.resolve(createMoney(1000, 'STX')));

  it('orders transfers with sequential nonces and sends STX last', async () => {
    const plan = await buildMovePlan({
      sender,
      recipient,
      network: STACKS_MAINNET,
      startNonce: 7,
      availableStx: createMoney(100_000, 'STX'),
      tokens: [token],
      nfts: [nft],
      estimateFee,
    });

    if (plan.status !== 'ready') throw new Error('Expected a ready plan');
    expect(plan.transactions.map(tx => tx.label)).toEqual(['ALEX', 'BNS-V2 #42', 'STX']);
    expect(plan.transactions.map(tx => Number(tx.unsignedTx.auth.spendingCondition.nonce))).toEqual(
      [7, 8, 9]
    );
    expect(plan.totalFee.amount.toNumber()).toEqual(3000);
    expect(plan.stxAmount.amount.toNumber()).toEqual(97_000);
  });

  it('fails when the fees leave no STX to move', async () => {
    const plan = await buildMovePlan({
      sender,
      recipient,
      network: STACKS_MAINNET,
      startNonce: 0,
      availableStx: createMoney(2000, 'STX'),
      tokens: [token],
      nfts: [],
      estimateFee,
    });

    expect(plan).toEqual({ status: 'error', message: 'Not enough STX to pay the fees' });
  });
});
