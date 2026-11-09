import type {
  ApprovalAccount,
  ApprovalApp,
  ApprovalRequest,
  ApprovalRequester,
} from './approval-scenario.types';

export const exampleAddresses = {
  bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  stacks: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  bitcoinVault: 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
  stacksVault: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
  recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  stacksRecipient: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
} as const;

export const exampleContracts = {
  zest: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-borrow-v2-0',
  bns: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2',
  bitflow: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-core-v-1-2',
  pox: 'SP000000000000000000002Q6VF78.pox-4',
  staking: 'SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.staking-enrollment-v1',
  rewards: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.reward-claims',
  nft: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.mint-collection',
  dao: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.dao-proposal-voting',
  unknown: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.vault-router',
} as const;

export function requester(name: string, origin: string, verified = true): ApprovalRequester {
  return { name, origin, monogram: name.charAt(0).toUpperCase(), verified };
}

export function app(
  name: string,
  origin: string,
  { headline, description, actionLabel }: Omit<ApprovalApp, 'name' | 'origin'>
): ApprovalApp {
  return { name, origin, headline, description, actionLabel };
}

export function leatherRequester() {
  return requester('Leather', 'leather.io');
}

export function baseRequest(
  account: ApprovalAccount,
  overrides: Pick<ApprovalRequest, 'kind' | 'title' | 'subtitle' | 'chain' | 'requester'> &
    Partial<ApprovalRequest>
): ApprovalRequest {
  return {
    mode: 'broadcast',
    movements: [],
    limits: [],
    details: [],
    permissions: [],
    notices: [],
    signers: [],
    alreadySigned: false,
    primaryAction: 'Approve',
    account,
    ...overrides,
  };
}
