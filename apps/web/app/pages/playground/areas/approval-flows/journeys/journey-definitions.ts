import {
  appBitcoinTransactionRequest,
  appStacksTransactionRequest,
  deliveryOptions,
  psbtRequest,
} from '../scenarios/app-transaction-scenarios';
import type { ApprovalChain, ApprovalRequest, SignerKind } from '../scenarios/approval-model';
import { connectRequest } from '../scenarios/connect-scenarios';
import {
  contractMintRequest,
  contractUnlimitedRequest,
  contractVoteRequest,
} from '../scenarios/contract-call-scenarios';
import {
  type SendAssetSymbol,
  leatherSendRequest,
  leatherSwapRequest,
} from '../scenarios/leather-scenarios';
import { messageFormats, messageRequest } from '../scenarios/message-scenarios';
import {
  bitcoinStakingRequest,
  bitflowSwapRequest,
  bnsRegistrationRequest,
  rewardClaimRequest,
  stackingEndRequest,
  stackingRequest,
  zestBorrowRequest,
  zestSupplyRequest,
} from '../scenarios/protocol-scenarios';
import { vaultRequest, vaultStages } from '../scenarios/vault-scenarios';

export interface JourneyVariant {
  id: string;
  label: string;
  buildRequest(kind: SignerKind): ApprovalRequest;
}

export interface JourneyDefinition {
  id: string;
  title: string;
  group: string;
  appAction: string;
  variants: JourneyVariant[];
}

function single(buildRequest: (kind: SignerKind) => ApprovalRequest): JourneyVariant[] {
  return [{ id: 'default', label: 'Default', buildRequest }];
}

const sendAssets: SendAssetSymbol[] = ['BTC', 'STX', 'sBTC'];
const vaultChains: { id: ApprovalChain; label: string }[] = [
  { id: 'bitcoin', label: 'Bitcoin vault' },
  { id: 'stacks', label: 'Stacks vault' },
];

export const journeyDefinitions: JourneyDefinition[] = [
  {
    id: 'connect',
    title: 'Connect',
    group: 'Connect and sign',
    appAction: 'Connect wallet',
    variants: [
      {
        id: 'first-visit',
        label: 'First visit',
        buildRequest: kind => connectRequest(kind, { firstVisit: true }),
      },
      {
        id: 'returning',
        label: 'Returning',
        buildRequest: kind => connectRequest(kind, { firstVisit: false }),
      },
    ],
  },
  {
    id: 'message-signing',
    title: 'Message signing',
    group: 'Connect and sign',
    appAction: 'Sign in with Leather',
    variants: messageFormats.map(format => ({
      id: format.id,
      label: format.label,
      buildRequest: (kind: SignerKind) => messageRequest(kind, format.id),
    })),
  },
  {
    id: 'leather-send',
    title: 'Leather send',
    group: 'Leather',
    appAction: 'Review send',
    variants: sendAssets.map(symbol => ({
      id: symbol.toLowerCase(),
      label: symbol,
      buildRequest: (kind: SignerKind) => leatherSendRequest(kind, symbol),
    })),
  },
  {
    id: 'leather-swap',
    title: 'Leather swap',
    group: 'Leather',
    appAction: 'Review swap',
    variants: single(leatherSwapRequest),
  },
  {
    id: 'app-bitcoin-transaction',
    title: 'App Bitcoin transaction',
    group: 'App-built transactions',
    appAction: 'Pay with Leather',
    variants: deliveryOptions.map(option => ({
      id: option.id,
      label: option.label,
      buildRequest: (kind: SignerKind) => appBitcoinTransactionRequest(kind, option.id),
    })),
  },
  {
    id: 'app-stacks-transaction',
    title: 'App Stacks transaction',
    group: 'App-built transactions',
    appAction: 'Pay with Leather',
    variants: deliveryOptions.map(option => ({
      id: option.id,
      label: option.label,
      buildRequest: (kind: SignerKind) => appStacksTransactionRequest(kind, option.id),
    })),
  },
  {
    id: 'psbt-signing',
    title: 'PSBT signing',
    group: 'App-built transactions',
    appAction: 'Buy now',
    variants: deliveryOptions.map(option => ({
      id: option.id,
      label: option.label,
      buildRequest: (kind: SignerKind) => psbtRequest(kind, option.id),
    })),
  },
  {
    id: 'vault',
    title: 'Vault payment',
    group: 'Vaults',
    appAction: 'Open vault payment',
    variants: vaultChains.flatMap(chain =>
      vaultStages.map(stage => ({
        id: `${chain.id}-${stage.id}`,
        label: `${chain.label} · ${stage.label}`,
        buildRequest: (kind: SignerKind) => vaultRequest(kind, chain.id, stage.id),
      }))
    ),
  },
  {
    id: 'bitcoin-staking',
    title: 'Bitcoin staking enrollment',
    group: 'Protocols',
    appAction: 'Start staking',
    variants: single(bitcoinStakingRequest),
  },
  {
    id: 'zest-supply',
    title: 'Zest supply and withdraw',
    group: 'Protocols',
    appAction: 'Confirm',
    variants: [
      { id: 'supply', label: 'Supply', buildRequest: kind => zestSupplyRequest(kind, 'supply') },
      {
        id: 'withdraw',
        label: 'Withdraw',
        buildRequest: kind => zestSupplyRequest(kind, 'withdraw'),
      },
    ],
  },
  {
    id: 'zest-borrow',
    title: 'Zest borrow and repay',
    group: 'Protocols',
    appAction: 'Confirm',
    variants: [
      { id: 'borrow', label: 'Borrow', buildRequest: kind => zestBorrowRequest(kind, 'borrow') },
      { id: 'repay', label: 'Repay', buildRequest: kind => zestBorrowRequest(kind, 'repay') },
    ],
  },
  {
    id: 'bns-registration',
    title: 'BNS registration',
    group: 'Protocols',
    appAction: 'Register name',
    variants: single(bnsRegistrationRequest),
  },
  {
    id: 'bitflow-swap',
    title: 'Bitflow swap',
    group: 'Protocols',
    appAction: 'Swap',
    variants: single(bitflowSwapRequest),
  },
  {
    id: 'stacking',
    title: 'Stacking',
    group: 'Protocols',
    appAction: 'Stack STX',
    variants: single(stackingRequest),
  },
  {
    id: 'stacking-end',
    title: 'End stacking',
    group: 'Protocols',
    appAction: 'Stop staking',
    variants: single(stackingEndRequest),
  },
  {
    id: 'reward-claim',
    title: 'Reward claim',
    group: 'Protocols',
    appAction: 'Claim rewards',
    variants: single(rewardClaimRequest),
  },
  {
    id: 'contract-mint',
    title: 'Contract call: mint',
    group: 'Contract calls',
    appAction: 'Mint',
    variants: single(contractMintRequest),
  },
  {
    id: 'contract-vote',
    title: 'Contract call: vote',
    group: 'Contract calls',
    appAction: 'Vote for',
    variants: single(contractVoteRequest),
  },
  {
    id: 'contract-unlimited',
    title: 'Contract call: no limits',
    group: 'Contract calls',
    appAction: 'Execute route',
    variants: single(contractUnlimitedRequest),
  },
];

export function findJourney(id: string | null | undefined) {
  return journeyDefinitions.find(journey => journey.id === id) ?? journeyDefinitions[0];
}

export function findVariant(journey: JourneyDefinition, id: string | null | undefined) {
  return journey.variants.find(variant => variant.id === id) ?? journey.variants[0];
}
