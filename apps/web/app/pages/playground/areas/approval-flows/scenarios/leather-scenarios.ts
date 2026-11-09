import { type ApprovalAssetSymbol, assetAmount, formatAssetAmount } from './approval-assets';
import { app, baseRequest, exampleAddresses, leatherRequester } from './approval-fixtures';
import type {
  ApprovalAccounts,
  ApprovalChain,
  ApprovalScenario,
  ApprovalScenarioVariant,
} from './approval-scenario.types';

const leather = leatherRequester();

interface SendFixture {
  id: string;
  label: string;
  asset: ApprovalAssetSymbol;
  units: number;
  chain: ApprovalChain;
  recipient: string;
  fee: number;
  feeAsset: ApprovalAssetSymbol;
}

const sendFixtures: SendFixture[] = [
  {
    id: 'btc',
    label: 'BTC',
    asset: 'BTC',
    units: 0.0125,
    chain: 'bitcoin',
    recipient: exampleAddresses.recipient,
    fee: 0.0000282,
    feeAsset: 'BTC',
  },
  {
    id: 'stx',
    label: 'STX',
    asset: 'STX',
    units: 250,
    chain: 'stacks',
    recipient: exampleAddresses.stacksRecipient,
    fee: 0.003,
    feeAsset: 'STX',
  },
  {
    id: 'sbtc',
    label: 'sBTC',
    asset: 'sBTC',
    units: 0.004,
    chain: 'stacks',
    recipient: exampleAddresses.stacksRecipient,
    fee: 0.0045,
    feeAsset: 'STX',
  },
];

function sendVariant(fixture: SendFixture): ApprovalScenarioVariant {
  const amount = assetAmount(fixture.asset, fixture.units);
  const movement = { direction: 'out' as const, amount, counterparty: fixture.recipient };
  return {
    id: fixture.id,
    label: fixture.label,
    build({ personal }: ApprovalAccounts) {
      return baseRequest(personal, {
        kind: 'transaction',
        title: `Send ${formatAssetAmount(amount)}`,
        subtitle: 'Review the recipient before you send. Sends cannot be reversed.',
        chain: fixture.chain,
        requester: leather,
        movements: [movement],
        limits:
          fixture.chain === 'stacks'
            ? [
                {
                  label: 'Post-condition',
                  detail: `Fails unless exactly ${formatAssetAmount(amount)} leaves this account`,
                },
              ]
            : [],
        fee: { amount: assetAmount(fixture.feeAsset, fixture.fee), label: 'Standard fee' },
        details: [{ label: 'Recipient', value: fixture.recipient, mono: true }],
        primaryAction: 'Send',
      });
    },
    outcome: {
      movements: [movement],
      activityTitle: `Sent ${formatAssetAmount(amount)}`,
      activityCaption: 'Leather send',
    },
  };
}

const swapOut = assetAmount('STX', 400);
const swapIn = assetAmount('sBTC', 0.0094);

export const leatherScenarios: ApprovalScenario[] = [
  {
    id: 'leather-send-swap',
    section: 'leather',
    title: 'Leather sends and swaps',
    summary: 'Requests Leather builds itself, so every amount and limit is known.',
    app: app('Leather', 'leather.io', {
      headline: 'Send and swap',
      description: 'Built in the wallet, approved in the same popover.',
      actionLabel: 'Review in Leather',
    }),
    variants: [
      ...sendFixtures.map(sendVariant),
      {
        id: 'swap',
        label: 'Swap STX → sBTC',
        build({ personal }) {
          return baseRequest(personal, {
            kind: 'transaction',
            title: 'Swap STX for sBTC',
            subtitle: 'Routed through Bitflow. The minimum received is enforced on-chain.',
            chain: 'stacks',
            requester: leather,
            movements: [
              { direction: 'out', amount: swapOut },
              { direction: 'in', amount: swapIn },
            ],
            limits: [
              { label: 'Spend limit', detail: `At most ${formatAssetAmount(swapOut)}` },
              {
                label: 'Minimum received',
                detail: `At least ${formatAssetAmount(assetAmount('sBTC', 0.0093))}`,
              },
            ],
            fee: { amount: assetAmount('STX', 0.012), label: 'Standard fee' },
            details: [
              { label: 'Route', value: 'STX → sBTC via Bitflow' },
              { label: 'Slippage', value: '1%' },
            ],
            primaryAction: 'Swap',
          });
        },
        outcome: {
          movements: [
            { direction: 'out', amount: swapOut },
            { direction: 'in', amount: swapIn },
          ],
          activityTitle: 'Swapped STX for sBTC',
          activityCaption: 'Bitflow route',
        },
      },
    ],
  },
];
