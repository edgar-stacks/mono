import { amount } from './approval-assets';
import type { ApprovalRequest, ApprovalRequester, SignerKind } from './approval-model';
import { stxFee } from './leather-scenarios';
import { requesters, signerFor } from './scenario-fixtures';

type ZestSupplyAction = 'supply' | 'withdraw';
type ZestBorrowAction = 'borrow' | 'repay';

interface ContractRequestInput
  extends Pick<
    ApprovalRequest,
    'title' | 'movements' | 'limits' | 'notices' | 'afterApproval' | 'contractCall'
  > {
  requester: ApprovalRequester;
}

function contractRequest(kind: SignerKind, input: ContractRequestInput): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'stx_callContract',
    chain: 'stacks',
    delivery: 'broadcast',
    signer: signerFor(kind, 'stacks'),
    fee: stxFee(),
    ...input,
  };
}

export function bitcoinStakingRequest(kind: SignerKind): ApprovalRequest {
  return contractRequest(kind, {
    title: 'Start staking with Fast Pool',
    requester: requesters.leatherStaking,
    contractCall: {
      contractId: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3',
      functionName: 'delegate-stx',
      args: [
        { name: 'amount-ustx', value: '3,200 STX' },
        { name: 'until-burn-ht', value: 'none (12 cycles requested)' },
        { name: 'payout', value: 'BTC, paid by Fast Pool' },
      ],
    },
    movements: [],
    limits: { mode: 'deny', rules: ['No tokens leave your account'] },
    notices: [
      {
        tone: 'info',
        text: '3,200 STX stays in your account and locks at the start of the next cycle.',
      },
    ],
    afterApproval:
      'Fast Pool stakes on your behalf from the next cycle. Rewards arrive as BTC about two weeks after each cycle.',
  });
}

export function stackingRequest(kind: SignerKind): ApprovalRequest {
  return contractRequest(kind, {
    title: 'Stack STX with StackingDAO',
    requester: requesters.stackingDao,
    contractCall: {
      contractId: 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v2',
      functionName: 'deposit',
      args: [
        { name: 'stx-amount', value: '5,000 STX' },
        { name: 'referrer', value: 'none' },
      ],
    },
    movements: [
      { direction: 'out', value: amount('STX', 5000) },
      { direction: 'in', value: amount('stSTX', 4568.31), estimated: true },
    ],
    limits: {
      mode: 'deny',
      rules: ['You send exactly 5,000 STX', 'You receive at least 4,545 stSTX'],
    },
    notices: [],
    afterApproval:
      'You hold stSTX instead of STX. It grows in value as StackingDAO earns stacking rewards.',
  });
}

export function stackingEndRequest(kind: SignerKind): ApprovalRequest {
  return contractRequest(kind, {
    title: 'Stop staking with Fast Pool',
    requester: requesters.fastPool,
    contractCall: {
      contractId: 'SP000000000000000000002Q6VF78.pox-4',
      functionName: 'revoke-delegate-stx',
      args: [],
    },
    movements: [],
    limits: { mode: 'deny', rules: ['No tokens leave your account'] },
    notices: [
      {
        tone: 'warning',
        text: 'Your 3,200 STX stays locked until cycle 112 ends, in about 9 days.',
      },
    ],
    afterApproval:
      'Fast Pool stops renewing your stake. You keep earning rewards for the current cycle.',
  });
}

export function rewardClaimRequest(kind: SignerKind): ApprovalRequest {
  return contractRequest(kind, {
    title: 'Claim staking rewards',
    requester: requesters.leatherStaking,
    contractCall: {
      contractId: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.sbtc-rewards-v1',
      functionName: 'claim-rewards',
      args: [{ name: 'cycles', value: '108, 109, 110' }],
    },
    movements: [{ direction: 'in', value: amount('sBTC', 0.00041), estimated: true }],
    limits: { mode: 'deny', rules: ['No tokens leave your account'] },
    notices: [],
    afterApproval: 'Rewards for 3 cycles move into your sBTC balance once the claim confirms.',
  });
}

export function zestSupplyRequest(kind: SignerKind, action: ZestSupplyAction): ApprovalRequest {
  const isSupply = action === 'supply';
  return contractRequest(kind, {
    title: isSupply ? 'Supply sBTC to Zest' : 'Withdraw sBTC from Zest',
    requester: requesters.zest,
    contractCall: {
      contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-borrow-v2-1',
      functionName: action,
      args: [
        { name: 'asset', value: 'sBTC' },
        { name: 'amount', value: '0.02 sBTC' },
      ],
    },
    movements: isSupply
      ? [
          { direction: 'out', value: amount('sBTC', 0.02) },
          { direction: 'in', value: amount('zsBTC', 0.02), estimated: true },
        ]
      : [
          { direction: 'out', value: amount('zsBTC', 0.02) },
          { direction: 'in', value: amount('sBTC', 0.02003), estimated: true },
        ],
    limits: {
      mode: 'deny',
      rules: isSupply
        ? ['You send exactly 0.02 sBTC', 'You receive at least 0.02 zsBTC']
        : ['You send exactly 0.02 zsBTC', 'You receive at least 0.02 sBTC'],
    },
    notices: [],
    afterApproval: isSupply
      ? 'Your sBTC earns supply interest on Zest. Withdraw it any time the pool has liquidity.'
      : 'Your sBTC and the interest it earned return to your balance.',
  });
}

export function zestBorrowRequest(kind: SignerKind, action: ZestBorrowAction): ApprovalRequest {
  const isBorrow = action === 'borrow';
  return contractRequest(kind, {
    title: isBorrow ? 'Borrow aeUSDC on Zest' : 'Repay aeUSDC on Zest',
    requester: requesters.zest,
    contractCall: {
      contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-borrow-v2-1',
      functionName: action,
      args: [
        { name: 'asset', value: 'aeUSDC' },
        { name: 'amount', value: '500 aeUSDC' },
      ],
    },
    movements: isBorrow
      ? [{ direction: 'in', value: amount('aeUSDC', 500) }]
      : [{ direction: 'out', value: amount('aeUSDC', 500) }],
    limits: {
      mode: 'deny',
      rules: isBorrow ? ['No tokens leave your account'] : ['You send exactly 500 aeUSDC'],
    },
    notices: isBorrow
      ? [
          {
            tone: 'warning',
            text: 'Health factor drops from 3.4 to 1.9. Below 1.0 your sBTC collateral can be liquidated.',
          },
        ]
      : [],
    afterApproval: isBorrow
      ? 'You receive 500 aeUSDC and owe it plus interest, backed by your supplied sBTC.'
      : 'Your debt drops by 500 aeUSDC and your health factor rises.',
  });
}

export function bnsRegistrationRequest(kind: SignerKind): ApprovalRequest {
  return contractRequest(kind, {
    title: 'Register leatherfan.btc',
    requester: requesters.bns,
    contractCall: {
      contractId: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2',
      functionName: 'name-claim-fast',
      args: [
        { name: 'name', value: 'leatherfan' },
        { name: 'namespace', value: 'btc' },
      ],
    },
    movements: [{ direction: 'out', value: amount('STX', 2) }],
    limits: {
      mode: 'deny',
      rules: ['You send exactly 2 STX', 'You receive the name leatherfan.btc'],
    },
    notices: [],
    afterApproval: 'leatherfan.btc points to your Stacks address once the registration confirms.',
  });
}

export function bitflowSwapRequest(kind: SignerKind): ApprovalRequest {
  return contractRequest(kind, {
    title: 'Swap STX for sBTC',
    requester: requesters.bitflow,
    contractCall: {
      contractId: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-swap-helper-v-1-3',
      functionName: 'swap-helper-a',
      args: [
        { name: 'amount', value: '1,500 STX' },
        { name: 'min-received', value: '0.00951 sBTC' },
      ],
    },
    movements: [
      { direction: 'out', value: amount('STX', 1500) },
      { direction: 'in', value: amount('sBTC', 0.00961), estimated: true },
    ],
    limits: {
      mode: 'deny',
      rules: ['You send exactly 1,500 STX', 'You receive at least 0.00951 sBTC'],
    },
    notices: [],
    afterApproval:
      'The swap settles in one transaction. If the price moves past your limit, it fails and only the fee is spent.',
  });
}
