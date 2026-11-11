import type {
  ApprovalChain,
  ApprovalRequester,
  ApprovalSigner,
  SignerKind,
} from './approval-model';

export const requesters = {
  leather: {
    name: 'Leather',
    origin: 'leather.io',
    monogram: 'L',
    tint: '#12100F',
  },
  bitflow: {
    name: 'Bitflow',
    origin: 'app.bitflow.finance',
    monogram: 'B',
    tint: '#F25C2A',
  },
  zest: {
    name: 'Zest',
    origin: 'app.zestprotocol.com',
    monogram: 'Z',
    tint: '#7C5CFC',
  },
  bns: {
    name: 'BNS One',
    origin: 'bns.one',
    monogram: 'N',
    tint: '#1E7F5C',
  },
  fastPool: {
    name: 'Fast Pool',
    origin: 'fastpool.org',
    monogram: 'F',
    tint: '#2F6FEB',
  },
  stackingDao: {
    name: 'StackingDAO',
    origin: 'app.stackingdao.com',
    monogram: 'S',
    tint: '#0F5132',
  },
  gamma: {
    name: 'Gamma',
    origin: 'gamma.io',
    monogram: 'G',
    tint: '#C2185B',
  },
  magicEden: {
    name: 'Magic Eden',
    origin: 'magiceden.io',
    monogram: 'M',
    tint: '#E42575',
  },
  alex: {
    name: 'ALEX',
    origin: 'app.alexlab.co',
    monogram: 'A',
    tint: '#1A1A2E',
  },
  dao: {
    name: 'Stacks DAO Hub',
    origin: 'daohub.example',
    monogram: 'D',
    tint: '#5D4037',
  },
  leatherStaking: {
    name: 'Leather staking',
    origin: 'app.leather.io',
    monogram: 'L',
    tint: '#12100F',
  },
} satisfies Record<string, ApprovalRequester>;

const accountAddresses: Record<SignerKind, Record<ApprovalChain, string>> = {
  software: {
    bitcoin: 'bc1q9h6tq79rq5m0sy8u4dj9fxdhn5d4aq2f9w3vxk',
    stacks: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQVX8X0G',
  },
  ledger: {
    bitcoin: 'bc1qxl4vfp2wq3k6z5r0j9s8m7n4c2d1e0f3g6h8kl',
    stacks: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
  },
};

const accountNames: Record<SignerKind, string> = {
  software: 'Account 1',
  ledger: 'Ledger account',
};

export function signerFor(kind: SignerKind, chain: ApprovalChain): ApprovalSigner {
  return { kind, chain, accountName: accountNames[kind], address: accountAddresses[kind][chain] };
}

export function accountAddress(kind: SignerKind, chain: ApprovalChain) {
  return accountAddresses[kind][chain];
}

export const counterparties = {
  friendBitcoin: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  friendStacks: 'SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R',
  vaultBitcoin: 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej',
  vaultStacks: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
};
