import { assetAmount, formatAssetAmount } from './approval-assets';
import { app, baseRequest, exampleContracts, requester } from './approval-fixtures';
import type { ApprovalScenario } from './approval-scenario.types';

const leatherStacking = requester('Leather stacking', 'app.leather.io');
const fastPool = requester('Fast Pool', 'fastpool.org');

const stackedAmount = assetAmount('STX', 5_000);
const stacksFee = assetAmount('STX', 0.01);
const rewardAmount = assetAmount('BTC', 0.00041);

export const stackingScenarios: ApprovalScenario[] = [
  {
    id: 'stacking',
    section: 'stacking',
    title: 'Stacking',
    summary: 'Lock STX with a pool for BTC rewards.',
    app: app(fastPool.name, fastPool.origin, {
      headline: 'Stack with Fast Pool',
      description: 'Lock STX each cycle and earn BTC.',
      actionLabel: 'Allow pool and stack',
    }),
    variants: [
      {
        id: 'delegate',
        label: 'Delegate to a pool',
        build({ personal }) {
          return baseRequest(personal, {
            kind: 'transaction',
            title: `Stack ${formatAssetAmount(stackedAmount)}`,
            subtitle: 'Your STX stays in your account and is locked while you stack.',
            chain: 'stacks',
            requester: fastPool,
            limits: [
              { label: 'Lock', detail: `Up to ${formatAssetAmount(stackedAmount)}, no transfer` },
            ],
            fee: { amount: stacksFee, label: 'Standard fee' },
            details: [
              { label: 'Contract', value: exampleContracts.pox, mono: true },
              { label: 'Function', value: 'delegate-stx', mono: true },
              { label: 'Pool', value: 'Fast Pool' },
            ],
            primaryAction: 'Stack',
          });
        },
        outcome: {
          movements: [],
          activityTitle: 'Started stacking',
          activityCaption: 'Fast Pool',
        },
      },
    ],
  },
  {
    id: 'end-stacking',
    section: 'stacking',
    title: 'End stacking',
    summary: 'Stop stacking. STX unlocks at the end of the cycle.',
    app: app(leatherStacking.name, leatherStacking.origin, {
      headline: 'Stacking with Fast Pool',
      description: '5,000 STX locked until cycle 112.',
      actionLabel: 'End stacking',
    }),
    variants: [
      {
        id: 'revoke',
        label: 'Revoke delegation',
        build({ personal }) {
          return baseRequest(personal, {
            kind: 'transaction',
            title: 'End stacking',
            subtitle: 'Your STX stays locked until cycle 112 ends, then unlocks.',
            chain: 'stacks',
            requester: leatherStacking,
            fee: { amount: stacksFee, label: 'Standard fee' },
            details: [
              { label: 'Contract', value: exampleContracts.pox, mono: true },
              { label: 'Function', value: 'revoke-delegate-stx', mono: true },
              { label: 'Unlocks', value: 'About 9 days' },
            ],
            primaryAction: 'End stacking',
          });
        },
        outcome: {
          movements: [],
          activityTitle: 'Ended stacking',
          activityCaption: 'Unlocks after cycle 112',
        },
      },
    ],
  },
  {
    id: 'reward-claim',
    section: 'stacking',
    title: 'Reward claims',
    summary: 'Claim BTC rewards to this account.',
    app: app(leatherStacking.name, leatherStacking.origin, {
      headline: 'Rewards ready',
      description: 'Claim BTC earned in cycle 111.',
      actionLabel: 'Claim rewards',
    }),
    variants: [
      {
        id: 'claim',
        label: 'Claim BTC',
        build({ personal }) {
          return baseRequest(personal, {
            kind: 'transaction',
            title: `Claim ${formatAssetAmount(rewardAmount)}`,
            subtitle: 'Rewards are paid to the Bitcoin address of this account.',
            chain: 'stacks',
            requester: leatherStacking,
            movements: [{ direction: 'in', amount: rewardAmount }],
            fee: { amount: stacksFee, label: 'Standard fee' },
            details: [
              { label: 'Contract', value: exampleContracts.rewards, mono: true },
              { label: 'Function', value: 'claim', mono: true },
            ],
            primaryAction: 'Claim',
          });
        },
        outcome: {
          movements: [{ direction: 'in', amount: rewardAmount }],
          activityTitle: 'Claimed rewards',
          activityCaption: 'Cycle 111',
        },
      },
    ],
  },
];
