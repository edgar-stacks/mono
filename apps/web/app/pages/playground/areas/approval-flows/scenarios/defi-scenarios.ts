import { type AssetAmount, assetAmount, formatAssetAmount } from './approval-assets';
import { app, baseRequest, exampleContracts, requester } from './approval-fixtures';
import type {
  ApprovalAccounts,
  ApprovalMovement,
  ApprovalScenario,
  ApprovalScenarioVariant,
} from './approval-scenario.types';

const leatherStaking = requester('Leather staking', 'app.leather.io');
const zest = requester('Zest', 'app.zestprotocol.com');
const bns = requester('BNS One', 'bns.one');
const bitflow = requester('Bitflow', 'app.bitflow.finance');

const stacksFee = assetAmount('STX', 0.01);

interface ContractVariantFixture {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  functionName: string;
  movements: ApprovalMovement[];
  limitLabel: string;
  primaryAction: string;
  activityTitle: string;
}

function contractVariant(
  fixture: ContractVariantFixture,
  { contract, requesterName, origin }: { contract: string; requesterName: string; origin: string }
): ApprovalScenarioVariant {
  return {
    id: fixture.id,
    label: fixture.label,
    build({ personal }: ApprovalAccounts) {
      return baseRequest(personal, {
        kind: 'transaction',
        title: fixture.title,
        subtitle: fixture.subtitle,
        chain: 'stacks',
        requester: requester(requesterName, origin),
        movements: fixture.movements,
        limits: fixture.movements
          .filter(movement => movement.direction === 'out')
          .map(movement => ({
            label: fixture.limitLabel,
            detail: `At most ${formatAssetAmount(movement.amount)} leaves this account`,
          })),
        fee: { amount: stacksFee, label: `Set by ${requesterName}` },
        details: [
          { label: 'Contract', value: contract, mono: true },
          { label: 'Function', value: fixture.functionName, mono: true },
        ],
        primaryAction: fixture.primaryAction,
      });
    },
    outcome: {
      movements: fixture.movements,
      activityTitle: fixture.activityTitle,
      activityCaption: origin,
    },
  };
}

function out(amount: AssetAmount): ApprovalMovement {
  return { direction: 'out', amount };
}

function into(amount: AssetAmount): ApprovalMovement {
  return { direction: 'in', amount };
}

const zestContract = {
  contract: exampleContracts.zest,
  requesterName: zest.name,
  origin: zest.origin,
};

export const defiScenarios: ApprovalScenario[] = [
  {
    id: 'bitcoin-staking-enrollment',
    section: 'defi',
    title: 'Bitcoin staking enrollment',
    summary: 'Lock sBTC with a signer manager to earn BTC rewards.',
    app: app(leatherStaking.name, leatherStaking.origin, {
      headline: 'Stake sBTC',
      description: 'Earn BTC rewards. Your sBTC stays in your account.',
      actionLabel: 'Start staking',
    }),
    variants: [
      contractVariant(
        {
          id: 'enroll',
          label: 'Enroll',
          title: 'Enroll in Bitcoin staking',
          subtitle: 'Your sBTC stays in your account and is locked until you leave.',
          functionName: 'enroll',
          movements: [],
          limitLabel: 'Lock',
          primaryAction: 'Enroll',
          activityTitle: 'Enrolled in Bitcoin staking',
        },
        {
          contract: exampleContracts.staking,
          requesterName: leatherStaking.name,
          origin: leatherStaking.origin,
        }
      ),
    ],
  },
  {
    id: 'zest-supply-withdraw',
    section: 'defi',
    title: 'Zest supply and withdraw',
    summary: 'Supply sBTC to a lending pool and withdraw it later.',
    app: app(zest.name, zest.origin, {
      headline: 'sBTC pool',
      description: 'Supply sBTC and earn interest from borrowers.',
      actionLabel: 'Supply',
    }),
    variants: [
      contractVariant(
        {
          id: 'supply',
          label: 'Supply',
          title: 'Supply 0.02 sBTC',
          subtitle: 'You receive zsBTC that tracks your share of the pool.',
          functionName: 'supply',
          movements: [out(assetAmount('sBTC', 0.02))],
          limitLabel: 'Spend limit',
          primaryAction: 'Supply',
          activityTitle: 'Supplied sBTC to Zest',
        },
        zestContract
      ),
      contractVariant(
        {
          id: 'withdraw',
          label: 'Withdraw',
          title: 'Withdraw 0.02 sBTC',
          subtitle: 'Your pool share is burned and sBTC returns to this account.',
          functionName: 'withdraw',
          movements: [into(assetAmount('sBTC', 0.0201))],
          limitLabel: 'Spend limit',
          primaryAction: 'Withdraw',
          activityTitle: 'Withdrew sBTC from Zest',
        },
        zestContract
      ),
    ],
  },
  {
    id: 'zest-borrow-repay',
    section: 'defi',
    title: 'Zest borrow and repay',
    summary: 'Borrow against supplied collateral and pay the loan back.',
    app: app(zest.name, zest.origin, {
      headline: 'Borrow aeUSDC',
      description: 'Borrow against your supplied sBTC.',
      actionLabel: 'Borrow',
    }),
    variants: [
      contractVariant(
        {
          id: 'borrow',
          label: 'Borrow',
          title: 'Borrow 500 aeUSDC',
          subtitle: 'Your supplied sBTC secures the loan. Keep the health factor above 1.',
          functionName: 'borrow',
          movements: [into(assetAmount('aeUSDC', 500))],
          limitLabel: 'Spend limit',
          primaryAction: 'Borrow',
          activityTitle: 'Borrowed aeUSDC',
        },
        zestContract
      ),
      contractVariant(
        {
          id: 'repay',
          label: 'Repay',
          title: 'Repay 501.2 aeUSDC',
          subtitle: 'Pays back the loan and the interest owed so far.',
          functionName: 'repay',
          movements: [out(assetAmount('aeUSDC', 501.2))],
          limitLabel: 'Spend limit',
          primaryAction: 'Repay',
          activityTitle: 'Repaid aeUSDC',
        },
        zestContract
      ),
    ],
  },
  {
    id: 'bns-registration',
    section: 'defi',
    title: 'BNS registration',
    summary: 'Register a .btc name for this account.',
    app: app(bns.name, bns.origin, {
      headline: 'satoshi-fan.btc is available',
      description: 'Register for 1 year.',
      actionLabel: 'Register',
    }),
    variants: [
      contractVariant(
        {
          id: 'register',
          label: 'Register',
          title: 'Register satoshi-fan.btc',
          subtitle: 'The name points to this account once the registration confirms.',
          functionName: 'name-claim-fast',
          movements: [out(assetAmount('STX', 20))],
          limitLabel: 'Price',
          primaryAction: 'Register',
          activityTitle: 'Registered satoshi-fan.btc',
        },
        { contract: exampleContracts.bns, requesterName: bns.name, origin: bns.origin }
      ),
    ],
  },
  {
    id: 'bitflow-swap',
    section: 'defi',
    title: 'Bitflow swap',
    summary: 'Swap through an app with a minimum received.',
    app: app(bitflow.name, bitflow.origin, {
      headline: 'Swap sBTC → STX',
      description: 'Best route across Bitflow pools.',
      actionLabel: 'Swap',
    }),
    variants: [
      contractVariant(
        {
          id: 'swap',
          label: 'sBTC → STX',
          title: 'Swap 0.001 sBTC for STX',
          subtitle: 'The swap fails if you would receive less than the minimum.',
          functionName: 'swap-x-for-y',
          movements: [out(assetAmount('sBTC', 0.001)), into(assetAmount('STX', 42.1))],
          limitLabel: 'Spend limit',
          primaryAction: 'Swap',
          activityTitle: 'Swapped sBTC for STX',
        },
        { contract: exampleContracts.bitflow, requesterName: bitflow.name, origin: bitflow.origin }
      ),
    ],
  },
];
