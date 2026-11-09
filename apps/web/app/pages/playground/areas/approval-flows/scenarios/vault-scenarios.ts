import { assetAmount, formatAssetAmount } from './approval-assets';
import { app, baseRequest, exampleAddresses, leatherRequester } from './approval-fixtures';
import type {
  ApprovalAccounts,
  ApprovalChain,
  ApprovalRequest,
  ApprovalScenario,
  ApprovalScenarioVariant,
  ApprovalSigner,
} from './approval-scenario.types';

type VaultStep = 'propose' | 'cosign' | 'broadcast';

const leather = leatherRequester();

const vaultSpend = {
  bitcoin: assetAmount('BTC', 0.15),
  stacks: assetAmount('STX', 12_000),
} as const;

const vaultFee = {
  bitcoin: assetAmount('BTC', 0.0000412),
  stacks: assetAmount('STX', 0.02),
} as const;

const vaultRecipient = {
  bitcoin: exampleAddresses.recipient,
  stacks: exampleAddresses.stacksRecipient,
} as const;

function signersFor(step: VaultStep, accounts: ApprovalAccounts): ApprovalSigner[] {
  const you = accounts.personal.kind === 'ledger' ? 'ledger' : 'software';
  if (step === 'propose') {
    return [
      { label: 'You', state: 'you', device: you },
      { label: 'Maya', state: 'waiting', device: 'ledger' },
      { label: 'Jon', state: 'waiting', device: 'software' },
    ];
  }
  if (step === 'cosign') {
    return [
      { label: 'Maya', state: 'signed', device: 'ledger' },
      { label: 'You', state: 'you', device: you },
      { label: 'Jon', state: 'waiting', device: 'software' },
    ];
  }
  return [
    { label: 'Maya', state: 'signed', device: 'ledger' },
    { label: 'You', state: 'signed', device: you },
    { label: 'Jon', state: 'waiting', device: 'software' },
  ];
}

const stepCopy = {
  propose: {
    title: 'Propose a vault payment',
    subtitle: 'Your signature starts the proposal. 2 of 3 signers must approve.',
    primaryAction: 'Sign proposal',
    mode: 'sign-only',
  },
  cosign: {
    title: 'Co-sign a vault payment',
    subtitle: 'Maya proposed this payment. Your signature meets the 2 of 3 threshold.',
    primaryAction: 'Co-sign',
    mode: 'sign-only',
  },
  broadcast: {
    title: 'Broadcast a vault payment',
    subtitle: 'The threshold is met. Broadcasting uses the collected signatures.',
    primaryAction: 'Broadcast',
    mode: 'broadcast',
  },
} as const;

function vaultFor(accounts: ApprovalAccounts, chain: ApprovalChain) {
  return chain === 'bitcoin' ? accounts.bitcoinVault : accounts.stacksVault;
}

function vaultRequest(accounts: ApprovalAccounts, step: VaultStep, chain: ApprovalChain) {
  const copy = stepCopy[step];
  const amount = vaultSpend[chain];
  const request: ApprovalRequest = baseRequest(vaultFor(accounts, chain), {
    kind: `vault-${step}`,
    title: copy.title,
    subtitle: copy.subtitle,
    chain,
    mode: copy.mode,
    requester: leather,
    signer: accounts.personal,
    movements: [{ direction: 'out', amount, counterparty: vaultRecipient[chain] }],
    limits:
      chain === 'stacks'
        ? [
            {
              label: 'Post-condition',
              detail: `Exactly ${formatAssetAmount(amount)} leaves the vault`,
            },
          ]
        : [],
    fee: { amount: vaultFee[chain], label: 'Paid by the vault' },
    details: [
      { label: 'Recipient', value: vaultRecipient[chain], mono: true },
      { label: 'Threshold', value: '2 of 3' },
    ],
    signers: signersFor(step, accounts),
    alreadySigned: step === 'broadcast',
    primaryAction: copy.primaryAction,
  });
  return request;
}

function vaultVariant(step: VaultStep, chain: ApprovalChain): ApprovalScenarioVariant {
  const amount = vaultSpend[chain];
  return {
    id: chain,
    label: chain === 'bitcoin' ? 'Bitcoin vault' : 'Stacks vault',
    build(accounts) {
      return vaultRequest(accounts, step, chain);
    },
    outcome: {
      movements: [{ direction: 'out', amount, counterparty: vaultRecipient[chain] }],
      activityTitle: `Vault paid ${formatAssetAmount(amount)}`,
      activityCaption: 'Treasury vault',
    },
  };
}

const vaultApp = app('Leather vaults', 'app.leather.io', {
  headline: 'Treasury vault',
  description: 'Shared custody: 2 of 3 signers approve every payment.',
  actionLabel: 'Open in Leather',
});

export const vaultScenarios: ApprovalScenario[] = [
  {
    id: 'vault-propose',
    section: 'vaults',
    title: 'Vault propose',
    summary: 'Start a vault payment with your personal signer.',
    app: { ...vaultApp, actionLabel: 'Propose payment' },
    variants: [vaultVariant('propose', 'bitcoin'), vaultVariant('propose', 'stacks')],
  },
  {
    id: 'vault-cosign',
    section: 'vaults',
    title: 'Vault co-sign',
    summary: 'Add your signature to a payment another signer proposed.',
    app: { ...vaultApp, actionLabel: 'Review proposal' },
    variants: [vaultVariant('cosign', 'bitcoin'), vaultVariant('cosign', 'stacks')],
  },
  {
    id: 'vault-broadcast',
    section: 'vaults',
    title: 'Vault broadcast',
    summary: 'Broadcast a payment once the threshold is met. No new signature is needed.',
    app: { ...vaultApp, actionLabel: 'Broadcast payment' },
    variants: [vaultVariant('broadcast', 'bitcoin'), vaultVariant('broadcast', 'stacks')],
  },
];
