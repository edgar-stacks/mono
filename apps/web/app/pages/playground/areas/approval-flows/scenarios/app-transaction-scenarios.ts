import { assetAmount, formatAssetAmount } from './approval-assets';
import { app, baseRequest, exampleAddresses, requester } from './approval-fixtures';
import type {
  ApprovalAccounts,
  ApprovalChain,
  ApprovalOutcome,
  ApprovalRequest,
  ApprovalScenario,
  ApprovalScenarioVariant,
} from './approval-scenario.types';

const magicEden = requester('Magic Eden', 'magiceden.io');
const velar = requester('Velar', 'app.velar.com');

const bitcoinSpend = assetAmount('BTC', 0.0042);
const stacksSpend = assetAmount('STX', 120);

function appTransaction(
  { personal }: ApprovalAccounts,
  chain: ApprovalChain,
  mode: ApprovalRequest['mode']
) {
  const signOnly = mode === 'sign-only';
  const subtitle = signOnly
    ? 'Velar gets the signed transaction back and decides when to broadcast it.'
    : 'Leather broadcasts this transaction as soon as you approve.';
  if (chain === 'bitcoin') {
    return baseRequest(personal, {
      kind: 'transaction',
      title: `Pay ${formatAssetAmount(bitcoinSpend)}`,
      subtitle,
      chain,
      mode,
      requester: velar,
      movements: [
        { direction: 'out', amount: bitcoinSpend, counterparty: exampleAddresses.recipient },
      ],
      fee: { amount: assetAmount('BTC', 0.0000191), label: 'Set by Velar' },
      details: [
        { label: 'Inputs', value: '2 from this account' },
        { label: 'Outputs', value: '1 to Velar, 1 change back to you' },
      ],
      primaryAction: signOnly ? 'Sign' : 'Approve',
    });
  }
  return baseRequest(personal, {
    kind: 'transaction',
    title: 'Call add-liquidity',
    subtitle,
    chain,
    mode,
    requester: velar,
    movements: [{ direction: 'out', amount: stacksSpend }],
    limits: [{ label: 'Post-condition', detail: `At most ${formatAssetAmount(stacksSpend)}` }],
    fee: { amount: assetAmount('STX', 0.008), label: 'Set by Velar' },
    details: [
      {
        label: 'Contract',
        value: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.univ2-router',
        mono: true,
      },
      { label: 'Function', value: 'add-liquidity', mono: true },
    ],
    primaryAction: signOnly ? 'Sign' : 'Approve',
  });
}

function appTransactionOutcome(chain: ApprovalChain): ApprovalOutcome {
  const amount = chain === 'bitcoin' ? bitcoinSpend : stacksSpend;
  return {
    movements: [{ direction: 'out', amount }],
    activityTitle: chain === 'bitcoin' ? 'Paid Velar' : 'add-liquidity',
    activityCaption: 'app.velar.com',
  };
}

function appTransactionVariant(
  chain: ApprovalChain,
  mode: ApprovalRequest['mode']
): ApprovalScenarioVariant {
  const chainLabel = chain === 'bitcoin' ? 'Bitcoin' : 'Stacks';
  const modeLabel = mode === 'sign-only' ? 'sign only' : 'broadcast';
  return {
    id: `${chain}-${mode}`,
    label: `${chainLabel}, ${modeLabel}`,
    build(accounts) {
      return appTransaction(accounts, chain, mode);
    },
    outcome: appTransactionOutcome(chain),
  };
}

const psbtSpend = assetAmount('BTC', 0.0031);

function psbtVariant(mode: ApprovalRequest['mode']): ApprovalScenarioVariant {
  const signOnly = mode === 'sign-only';
  return {
    id: mode,
    label: signOnly ? 'Sign only' : 'Sign and broadcast',
    build({ personal }) {
      return baseRequest(personal, {
        kind: 'psbt',
        title: 'Buy Ordinal #78 412',
        subtitle: signOnly
          ? 'You sign 2 of 4 inputs. Magic Eden completes and broadcasts the trade.'
          : 'You sign 2 of 4 inputs and Leather broadcasts the completed trade.',
        chain: 'bitcoin',
        mode,
        requester: magicEden,
        movements: [
          { direction: 'out', amount: psbtSpend, counterparty: 'Seller' },
          {
            direction: 'in',
            amount: assetAmount('BTC', 0.00000546),
            counterparty: 'Ordinal #78 412',
          },
        ],
        fee: { amount: assetAmount('BTC', 0.0000214), label: 'Paid by your inputs' },
        details: [
          { label: 'Inputs you sign', value: '2 of 4' },
          { label: 'Sighash', value: 'ALL' },
        ],
        notices: [
          {
            tone: 'warning',
            title: 'Partially signed transaction',
            body: 'Only inputs from this account are signed. Other inputs belong to the seller.',
          },
        ],
        primaryAction: signOnly ? 'Sign' : 'Sign and broadcast',
      });
    },
    outcome: {
      movements: [{ direction: 'out', amount: psbtSpend }],
      activityTitle: 'Bought Ordinal #78 412',
      activityCaption: 'magiceden.io',
    },
  };
}

export const appTransactionScenarios: ApprovalScenario[] = [
  {
    id: 'app-transaction',
    section: 'app-transactions',
    title: 'App-built transactions',
    summary: 'An app builds the transaction. Leather shows what it can verify.',
    app: app(velar.name, velar.origin, {
      headline: 'Provide liquidity',
      description: 'Velar builds the transaction and asks Leather to sign it.',
      actionLabel: 'Confirm in wallet',
    }),
    variants: [
      appTransactionVariant('bitcoin', 'broadcast'),
      appTransactionVariant('bitcoin', 'sign-only'),
      appTransactionVariant('stacks', 'broadcast'),
      appTransactionVariant('stacks', 'sign-only'),
    ],
  },
  {
    id: 'psbt-signing',
    section: 'app-transactions',
    title: 'PSBT signing',
    summary: 'Sign some inputs of a shared Bitcoin transaction.',
    app: app(magicEden.name, magicEden.origin, {
      headline: 'Ordinal #78 412',
      description: 'Buy now for 0.0031 BTC.',
      actionLabel: 'Buy now',
    }),
    variants: [psbtVariant('sign-only'), psbtVariant('broadcast')],
  },
];
