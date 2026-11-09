import type {
  JourneyAccountId,
  JourneyAssetId,
  JourneyFee,
  JourneyMovement,
} from './journey-world';

type JourneyRequestKind = 'connect' | 'sign-message' | 'transaction' | 'psbt';

export type JourneyChain = 'bitcoin' | 'stacks';

type JourneyMode = 'broadcast' | 'sign-only';

type JourneyMessageFormat = 'utf8' | 'structured' | 'bip322';

export type JourneyVaultStep = 'propose' | 'co-sign' | 'broadcast';

export type JourneyLimitComparator = 'exactly' | 'at-most' | 'at-least';

export interface JourneyRequester {
  name: string;
  origin: string;
  initials: string;
  verified: boolean;
}

interface JourneyContractArg {
  name: string;
  value: string;
}

interface JourneyContractCall {
  contractId: string;
  functionName: string;
  args: JourneyContractArg[];
}

export interface JourneySpendingLimit {
  asset: JourneyAssetId;
  amount: number;
  comparator: JourneyLimitComparator;
}

export interface JourneyRequest {
  kind: JourneyRequestKind;
  method: string;
  chain: JourneyChain;
  mode: JourneyMode;
  title: string;
  appAction: string;
  accountId: JourneyAccountId;
  feePayer: JourneyAccountId;
  isGeneric: boolean;
  vaultStep?: JourneyVaultStep;
  message?: { format: JourneyMessageFormat; content: string };
  contract?: JourneyContractCall;
  recipient?: string;
  movements: JourneyMovement[];
  limits: JourneySpendingLimit[];
  fee: JourneyFee | null;
  activityTitle: string;
}

export interface JourneyVariant {
  id: string;
  label: string;
  request: JourneyRequest;
}

export interface JourneyDefinition {
  id: string;
  label: string;
  summary: string;
  requester: JourneyRequester;
  variants: [JourneyVariant, ...JourneyVariant[]];
}

const leatherApp: JourneyRequester = {
  name: 'Leather',
  origin: 'app.leather.io',
  initials: 'L',
  verified: true,
};

const bitflow: JourneyRequester = {
  name: 'Bitflow',
  origin: 'app.bitflow.finance',
  initials: 'Bf',
  verified: true,
};

const zest: JourneyRequester = {
  name: 'Zest Protocol',
  origin: 'app.zestprotocol.com',
  initials: 'Z',
  verified: true,
};

const unknownApp: JourneyRequester = {
  name: 'stx-farm.app',
  origin: 'stx-farm.app',
  initials: 'S',
  verified: false,
};

const recipientBitcoin = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const recipientStacks = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';

const bitcoinFee: JourneyFee = { asset: 'btc', amount: 1_420 };
const stacksFee: JourneyFee = { asset: 'stx', amount: 3_000 };
const contractFee: JourneyFee = { asset: 'stx', amount: 12_000 };

interface BaseRequestInput {
  title: string;
  appAction: string;
  activityTitle: string;
}

function stacksCall(
  input: BaseRequestInput & {
    contract: JourneyContractCall;
    movements: JourneyMovement[];
    limits: JourneySpendingLimit[];
    isGeneric?: boolean;
    mode?: JourneyMode;
    method?: string;
  }
): JourneyRequest {
  return {
    kind: 'transaction',
    method: input.method ?? 'stx_callContract',
    chain: 'stacks',
    mode: input.mode ?? 'broadcast',
    title: input.title,
    appAction: input.appAction,
    accountId: 'personal',
    feePayer: 'personal',
    isGeneric: input.isGeneric ?? false,
    contract: input.contract,
    movements: input.movements,
    limits: input.limits,
    fee: contractFee,
    activityTitle: input.activityTitle,
  };
}

function vaultVariant(chain: JourneyChain, step: JourneyVaultStep): JourneyVariant {
  const isBitcoin = chain === 'bitcoin';
  const accountId: JourneyAccountId = isBitcoin ? 'bitcoin-vault' : 'stacks-vault';
  const movement: JourneyMovement = isBitcoin
    ? { asset: 'btc', amount: -1_000_000 }
    : { asset: 'stx', amount: -1_500_000_000 };
  const stepLabels: Record<JourneyVaultStep, string> = {
    propose: 'Propose',
    'co-sign': 'Co-sign',
    broadcast: 'Broadcast',
  };
  const stepTitles: Record<JourneyVaultStep, string> = {
    propose: 'Propose a vault payment',
    'co-sign': 'Co-sign a vault payment',
    broadcast: 'Broadcast a vault payment',
  };
  return {
    id: `${chain}-${step}`,
    label: `${isBitcoin ? 'Bitcoin' : 'Stacks'} vault · ${stepLabels[step]}`,
    request: {
      kind: isBitcoin ? 'psbt' : 'transaction',
      method: isBitcoin ? 'signPsbt' : 'stx_signTransaction',
      chain,
      mode: step === 'broadcast' ? 'broadcast' : 'sign-only',
      title: stepTitles[step],
      appAction: stepLabels[step],
      accountId,
      feePayer: accountId,
      isGeneric: false,
      vaultStep: step,
      recipient: isBitcoin ? recipientBitcoin : recipientStacks,
      movements: [movement],
      limits: [{ asset: movement.asset, amount: -movement.amount, comparator: 'exactly' }],
      fee: isBitcoin ? { asset: 'btc', amount: 2_860 } : stacksFee,
      activityTitle: isBitcoin ? 'Sent Bitcoin from vault' : 'Sent Stacks from vault',
    },
  };
}

export const journeyDefinitions: [JourneyDefinition, ...JourneyDefinition[]] = [
  {
    id: 'connect',
    label: 'Connect',
    summary: 'An app asks to see your addresses.',
    requester: bitflow,
    variants: [
      {
        id: 'first',
        label: 'First connection',
        request: {
          kind: 'connect',
          method: 'getAddresses',
          chain: 'stacks',
          mode: 'sign-only',
          title: 'Connect to Bitflow',
          appAction: 'Connect wallet',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          movements: [],
          limits: [],
          fee: null,
          activityTitle: 'Connected to Bitflow',
        },
      },
    ],
  },
  {
    id: 'sign-message',
    label: 'Message signing',
    summary: 'An app asks you to sign a message to prove you own an address.',
    requester: { name: 'Gamma', origin: 'gamma.io', initials: 'G', verified: true },
    variants: [
      {
        id: 'utf8',
        label: 'Plain text',
        request: {
          kind: 'sign-message',
          method: 'stx_signMessage',
          chain: 'stacks',
          mode: 'sign-only',
          title: 'Sign a message',
          appAction: 'Sign in',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          message: {
            format: 'utf8',
            content: 'Sign in to Gamma\n\nNonce: 7f3c91a2\nIssued at: 2026-11-09T09:12:00Z',
          },
          movements: [],
          limits: [],
          fee: null,
          activityTitle: 'Signed a message',
        },
      },
      {
        id: 'structured',
        label: 'Structured (SIP-018)',
        request: {
          kind: 'sign-message',
          method: 'stx_signStructuredMessage',
          chain: 'stacks',
          mode: 'sign-only',
          title: 'Sign structured data',
          appAction: 'List for sale',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          message: {
            format: 'structured',
            content: '{ domain: "gamma.io", action: "list", token-id: u4021, price: u125000000 }',
          },
          movements: [],
          limits: [],
          fee: null,
          activityTitle: 'Signed structured data',
        },
      },
      {
        id: 'bip322',
        label: 'Bitcoin (BIP-322)',
        request: {
          kind: 'sign-message',
          method: 'signMessage',
          chain: 'bitcoin',
          mode: 'sign-only',
          title: 'Sign a Bitcoin message',
          appAction: 'Verify address',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          message: { format: 'bip322', content: 'I own this address — gamma.io 2026-11-09' },
          movements: [],
          limits: [],
          fee: null,
          activityTitle: 'Signed a Bitcoin message',
        },
      },
    ],
  },
  {
    id: 'leather-send',
    label: 'Leather send',
    summary: 'Send from the Leather web app.',
    requester: leatherApp,
    variants: [
      {
        id: 'btc',
        label: 'BTC',
        request: {
          kind: 'transaction',
          method: 'sendTransfer',
          chain: 'bitcoin',
          mode: 'broadcast',
          title: 'Send Bitcoin',
          appAction: 'Send',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          recipient: recipientBitcoin,
          movements: [{ asset: 'btc', amount: -200_000 }],
          limits: [{ asset: 'btc', amount: 200_000, comparator: 'exactly' }],
          fee: bitcoinFee,
          activityTitle: 'Sent Bitcoin',
        },
      },
      {
        id: 'stx',
        label: 'STX',
        request: {
          kind: 'transaction',
          method: 'stx_transferStx',
          chain: 'stacks',
          mode: 'broadcast',
          title: 'Send Stacks',
          appAction: 'Send',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          recipient: recipientStacks,
          movements: [{ asset: 'stx', amount: -250_000_000 }],
          limits: [{ asset: 'stx', amount: 250_000_000, comparator: 'exactly' }],
          fee: stacksFee,
          activityTitle: 'Sent Stacks',
        },
      },
      {
        id: 'sbtc',
        label: 'sBTC',
        request: {
          kind: 'transaction',
          method: 'stx_transferSip10Ft',
          chain: 'stacks',
          mode: 'broadcast',
          title: 'Send sBTC',
          appAction: 'Send',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          recipient: recipientStacks,
          movements: [{ asset: 'sbtc', amount: -100_000 }],
          limits: [{ asset: 'sbtc', amount: 100_000, comparator: 'exactly' }],
          fee: stacksFee,
          activityTitle: 'Sent sBTC',
        },
      },
    ],
  },
  {
    id: 'leather-swap',
    label: 'Leather swap',
    summary: 'Swap from the Leather web app.',
    requester: leatherApp,
    variants: [
      {
        id: 'stx-sbtc',
        label: 'STX → sBTC',
        request: stacksCall({
          title: 'Swap STX for sBTC',
          appAction: 'Swap',
          activityTitle: 'Swapped STX for sBTC',
          contract: {
            contractId: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-swap-helper-v-1-3',
            functionName: 'swap-helper-a',
            args: [
              { name: 'amount', value: 'u100000000' },
              { name: 'min-received', value: 'u82000' },
            ],
          },
          movements: [
            { asset: 'stx', amount: -100_000_000 },
            { asset: 'sbtc', amount: 83_100 },
          ],
          limits: [
            { asset: 'stx', amount: 100_000_000, comparator: 'exactly' },
            { asset: 'sbtc', amount: 82_000, comparator: 'at-least' },
          ],
        }),
      },
      {
        id: 'sbtc-stx',
        label: 'sBTC → STX',
        request: stacksCall({
          title: 'Swap sBTC for STX',
          appAction: 'Swap',
          activityTitle: 'Swapped sBTC for STX',
          contract: {
            contractId: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-swap-helper-v-1-3',
            functionName: 'swap-helper-b',
            args: [
              { name: 'amount', value: 'u50000' },
              { name: 'min-received', value: 'u59000000' },
            ],
          },
          movements: [
            { asset: 'sbtc', amount: -50_000 },
            { asset: 'stx', amount: 59_600_000 },
          ],
          limits: [
            { asset: 'sbtc', amount: 50_000, comparator: 'exactly' },
            { asset: 'stx', amount: 59_000_000, comparator: 'at-least' },
          ],
        }),
      },
    ],
  },
  {
    id: 'app-bitcoin-transaction',
    label: 'App Bitcoin transaction',
    summary: 'An app builds a Bitcoin payment and asks you to send it.',
    requester: { name: 'Gamma', origin: 'gamma.io', initials: 'G', verified: true },
    variants: [
      {
        id: 'broadcast',
        label: 'Broadcast',
        request: {
          kind: 'transaction',
          method: 'sendTransfer',
          chain: 'bitcoin',
          mode: 'broadcast',
          title: 'Pay for an inscription',
          appAction: 'Pay',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          recipient: recipientBitcoin,
          movements: [{ asset: 'btc', amount: -45_000 }],
          limits: [{ asset: 'btc', amount: 45_000, comparator: 'exactly' }],
          fee: bitcoinFee,
          activityTitle: 'Sent Bitcoin',
        },
      },
    ],
  },
  {
    id: 'app-stacks-transaction',
    label: 'App Stacks transaction',
    summary: 'An app builds a Stacks transaction and asks you to sign or send it.',
    requester: { name: 'Granite', origin: 'app.granite.world', initials: 'Gr', verified: true },
    variants: [
      {
        id: 'broadcast',
        label: 'Broadcast',
        request: stacksCall({
          title: 'Deposit STX',
          appAction: 'Deposit',
          activityTitle: 'Deposited STX',
          contract: {
            contractId: 'SP35E2BBMDT2Y1HB0NTK139YBGYV3PAPK3WA8BRNA.liquidity-provider-v1',
            functionName: 'deposit',
            args: [{ name: 'amount', value: 'u40000000' }],
          },
          movements: [{ asset: 'stx', amount: -40_000_000 }],
          limits: [{ asset: 'stx', amount: 40_000_000, comparator: 'exactly' }],
        }),
      },
      {
        id: 'sign-only',
        label: 'Sign only',
        request: stacksCall({
          method: 'stx_signTransaction',
          mode: 'sign-only',
          title: 'Sign a deposit',
          appAction: 'Sign deposit',
          activityTitle: 'Signed a deposit',
          contract: {
            contractId: 'SP35E2BBMDT2Y1HB0NTK139YBGYV3PAPK3WA8BRNA.liquidity-provider-v1',
            functionName: 'deposit',
            args: [{ name: 'amount', value: 'u40000000' }],
          },
          movements: [{ asset: 'stx', amount: -40_000_000 }],
          limits: [{ asset: 'stx', amount: 40_000_000, comparator: 'exactly' }],
        }),
      },
    ],
  },
  {
    id: 'psbt',
    label: 'PSBT signing',
    summary: 'A marketplace asks you to sign a partially signed Bitcoin transaction.',
    requester: { name: 'Magic Eden', origin: 'magiceden.io', initials: 'ME', verified: true },
    variants: [
      {
        id: 'sign-only',
        label: 'Sign only',
        request: {
          kind: 'psbt',
          method: 'signPsbt',
          chain: 'bitcoin',
          mode: 'sign-only',
          title: 'Sign a purchase',
          appAction: 'Buy now',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          movements: [{ asset: 'btc', amount: -450_000 }],
          limits: [],
          fee: { asset: 'btc', amount: 2_100 },
          activityTitle: 'Bought an inscription',
        },
      },
      {
        id: 'broadcast',
        label: 'Sign and broadcast',
        request: {
          kind: 'psbt',
          method: 'signPsbt',
          chain: 'bitcoin',
          mode: 'broadcast',
          title: 'Buy an inscription',
          appAction: 'Buy now',
          accountId: 'personal',
          feePayer: 'personal',
          isGeneric: false,
          movements: [{ asset: 'btc', amount: -450_000 }],
          limits: [],
          fee: { asset: 'btc', amount: 2_100 },
          activityTitle: 'Bought an inscription',
        },
      },
    ],
  },
  {
    id: 'vault',
    label: 'Vault payment',
    summary: 'Propose, co-sign and broadcast a payment from a shared vault.',
    requester: leatherApp,
    variants: [
      vaultVariant('bitcoin', 'propose'),
      vaultVariant('bitcoin', 'co-sign'),
      vaultVariant('bitcoin', 'broadcast'),
      vaultVariant('stacks', 'propose'),
      vaultVariant('stacks', 'co-sign'),
      vaultVariant('stacks', 'broadcast'),
    ],
  },
  {
    id: 'bitcoin-staking',
    label: 'Bitcoin staking',
    summary: 'Enroll sBTC in Bitcoin staking.',
    requester: leatherApp,
    variants: [
      {
        id: 'enroll',
        label: 'Enroll',
        request: stacksCall({
          title: 'Enroll in Bitcoin staking',
          appAction: 'Start staking',
          activityTitle: 'Enrolled in Bitcoin staking',
          contract: {
            contractId: 'SP804CDG3KBN1M5JYW4QF9B1HQ6E2M7TV31FX5X7.sbtc-staking-v1',
            functionName: 'enroll',
            args: [
              { name: 'amount', value: 'u300000' },
              { name: 'cycles', value: 'u12' },
            ],
          },
          movements: [{ asset: 'sbtc', amount: -300_000 }],
          limits: [{ asset: 'sbtc', amount: 300_000, comparator: 'exactly' }],
        }),
      },
    ],
  },
  {
    id: 'zest-supply',
    label: 'Zest supply & withdraw',
    summary: 'Supply sBTC to Zest, or withdraw it.',
    requester: zest,
    variants: [
      {
        id: 'supply',
        label: 'Supply',
        request: stacksCall({
          title: 'Supply sBTC',
          appAction: 'Supply',
          activityTitle: 'Supplied sBTC',
          contract: {
            contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1',
            functionName: 'supply',
            args: [{ name: 'amount', value: 'u150000' }],
          },
          movements: [
            { asset: 'sbtc', amount: -150_000 },
            { asset: 'zsbtc', amount: 150_000 },
          ],
          limits: [{ asset: 'sbtc', amount: 150_000, comparator: 'exactly' }],
        }),
      },
      {
        id: 'withdraw',
        label: 'Withdraw',
        request: stacksCall({
          title: 'Withdraw sBTC',
          appAction: 'Withdraw',
          activityTitle: 'Withdrew sBTC',
          contract: {
            contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1',
            functionName: 'withdraw',
            args: [{ name: 'amount', value: 'u100000' }],
          },
          movements: [
            { asset: 'zsbtc', amount: -100_000 },
            { asset: 'sbtc', amount: 100_000 },
          ],
          limits: [{ asset: 'zsbtc', amount: 100_000, comparator: 'exactly' }],
        }),
      },
    ],
  },
  {
    id: 'zest-borrow',
    label: 'Zest borrow & repay',
    summary: 'Borrow USDh against supplied sBTC, or repay it.',
    requester: zest,
    variants: [
      {
        id: 'borrow',
        label: 'Borrow',
        request: stacksCall({
          title: 'Borrow USDh',
          appAction: 'Borrow',
          activityTitle: 'Borrowed USDh',
          contract: {
            contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1',
            functionName: 'borrow',
            args: [{ name: 'amount', value: 'u20000000000' }],
          },
          movements: [{ asset: 'usdh', amount: 20_000_000_000 }],
          limits: [],
        }),
      },
      {
        id: 'repay',
        label: 'Repay',
        request: stacksCall({
          title: 'Repay USDh',
          appAction: 'Repay',
          activityTitle: 'Repaid USDh',
          contract: {
            contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1',
            functionName: 'repay',
            args: [{ name: 'amount', value: 'u20000000000' }],
          },
          movements: [{ asset: 'usdh', amount: -20_000_000_000 }],
          limits: [{ asset: 'usdh', amount: 20_000_000_000, comparator: 'at-most' }],
        }),
      },
    ],
  },
  {
    id: 'bns',
    label: 'BNS registration',
    summary: 'Register a .btc name.',
    requester: { name: 'BNS One', origin: 'bns.one', initials: 'B', verified: true },
    variants: [
      {
        id: 'register',
        label: 'Register',
        request: stacksCall({
          title: 'Register leather-fan.btc',
          appAction: 'Register',
          activityTitle: 'Registered leather-fan.btc',
          contract: {
            contractId: 'SP2QEZ06AGJ3RKJPBV14SY1V5BBFNAW33D96YPGZF.BNS-V2',
            functionName: 'name-claim-fast',
            args: [
              { name: 'name', value: '"leather-fan"' },
              { name: 'namespace', value: '"btc"' },
            ],
          },
          movements: [{ asset: 'stx', amount: -2_000_000 }],
          limits: [{ asset: 'stx', amount: 2_000_000, comparator: 'exactly' }],
        }),
      },
    ],
  },
  {
    id: 'bitflow-swap',
    label: 'Bitflow swap',
    summary: 'Swap on Bitflow with a minimum received.',
    requester: bitflow,
    variants: [
      {
        id: 'stx-sbtc',
        label: 'STX → sBTC',
        request: stacksCall({
          title: 'Swap STX for sBTC',
          appAction: 'Swap',
          activityTitle: 'Swapped STX for sBTC',
          contract: {
            contractId: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.stableswap-stx-ststx-v-1-2',
            functionName: 'swap-x-for-y',
            args: [
              { name: 'x-amount', value: 'u500000000' },
              { name: 'min-dy', value: 'u410000' },
            ],
          },
          movements: [
            { asset: 'stx', amount: -500_000_000 },
            { asset: 'sbtc', amount: 415_500 },
          ],
          limits: [
            { asset: 'stx', amount: 500_000_000, comparator: 'exactly' },
            { asset: 'sbtc', amount: 410_000, comparator: 'at-least' },
          ],
        }),
      },
    ],
  },
  {
    id: 'stacking',
    label: 'Stacking',
    summary: 'Delegate STX to a stacking pool.',
    requester: leatherApp,
    variants: [
      {
        id: 'delegate',
        label: 'Delegate',
        request: stacksCall({
          title: 'Stack with Fast Pool',
          appAction: 'Start stacking',
          activityTitle: 'Started stacking',
          contract: {
            contractId: 'SP000000000000000000002Q6VF78.pox-4',
            functionName: 'delegate-stx',
            args: [
              { name: 'amount-ustx', value: 'u1000000000' },
              {
                name: 'delegate-to',
                value: "'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3",
              },
            ],
          },
          movements: [],
          limits: [],
        }),
      },
    ],
  },
  {
    id: 'stacking-end',
    label: 'End stacking',
    summary: 'Revoke a stacking delegation.',
    requester: leatherApp,
    variants: [
      {
        id: 'revoke',
        label: 'Revoke',
        request: stacksCall({
          title: 'End stacking',
          appAction: 'End stacking',
          activityTitle: 'Ended stacking',
          contract: {
            contractId: 'SP000000000000000000002Q6VF78.pox-4',
            functionName: 'revoke-delegate-stx',
            args: [],
          },
          movements: [],
          limits: [],
        }),
      },
    ],
  },
  {
    id: 'reward-claim',
    label: 'Reward claim',
    summary: 'Claim sBTC rewards.',
    requester: leatherApp,
    variants: [
      {
        id: 'claim',
        label: 'Claim',
        request: stacksCall({
          title: 'Claim sBTC rewards',
          appAction: 'Claim rewards',
          activityTitle: 'Claimed sBTC rewards',
          contract: {
            contractId: 'SP804CDG3KBN1M5JYW4QF9B1HQ6E2M7TV31FX5X7.sbtc-staking-v1',
            functionName: 'claim-rewards',
            args: [{ name: 'cycle', value: 'u118' }],
          },
          movements: [{ asset: 'sbtc', amount: 12_400 }],
          limits: [],
        }),
      },
    ],
  },
  {
    id: 'contract-call-limited',
    label: 'Contract call · limited',
    summary: 'An unmapped contract call with spending limits.',
    requester: unknownApp,
    variants: [
      {
        id: 'stx',
        label: 'STX limit',
        request: stacksCall({
          isGeneric: true,
          title: 'Call deposit-to-farm',
          appAction: 'Deposit',
          activityTitle: 'deposit-to-farm',
          contract: {
            contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.farm-v3',
            functionName: 'deposit-to-farm',
            args: [
              { name: 'amount', value: 'u50000000' },
              { name: 'lock', value: 'u4' },
            ],
          },
          movements: [{ asset: 'stx', amount: -50_000_000 }],
          limits: [{ asset: 'stx', amount: 50_000_000, comparator: 'at-most' }],
        }),
      },
    ],
  },
  {
    id: 'contract-call-multi',
    label: 'Contract call · multiple assets',
    summary: 'An unmapped contract call that moves several assets.',
    requester: unknownApp,
    variants: [
      {
        id: 'stx-sbtc',
        label: 'STX + sBTC limits',
        request: stacksCall({
          isGeneric: true,
          title: 'Call add-liquidity',
          appAction: 'Add liquidity',
          activityTitle: 'add-liquidity',
          contract: {
            contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.pool-v2',
            functionName: 'add-liquidity',
            args: [
              { name: 'x', value: 'u100000000' },
              { name: 'y', value: 'u80000' },
            ],
          },
          movements: [
            { asset: 'stx', amount: -100_000_000 },
            { asset: 'sbtc', amount: -80_000 },
          ],
          limits: [
            { asset: 'stx', amount: 100_000_000, comparator: 'at-most' },
            { asset: 'sbtc', amount: 80_000, comparator: 'at-most' },
          ],
        }),
      },
    ],
  },
  {
    id: 'contract-call-unlimited',
    label: 'Contract call · no limits',
    summary: 'An unmapped contract call without spending limits.',
    requester: unknownApp,
    variants: [
      {
        id: 'none',
        label: 'No limits',
        request: stacksCall({
          isGeneric: true,
          title: 'Call claim-airdrop',
          appAction: 'Claim',
          activityTitle: 'claim-airdrop',
          contract: {
            contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.airdrop-v1',
            functionName: 'claim-airdrop',
            args: [{ name: 'proof', value: '0x9c2f…41ab' }],
          },
          movements: [],
          limits: [],
        }),
      },
    ],
  },
];

interface ResolvedJourney {
  definition: JourneyDefinition;
  variant: JourneyVariant;
}

function findJourneyDefinition(journeyId: string | null | undefined) {
  return journeyDefinitions.find(definition => definition.id === journeyId);
}

export function resolveJourney(
  journeyId: string | null | undefined,
  variantId: string | null | undefined
): ResolvedJourney {
  const definition = findJourneyDefinition(journeyId) ?? journeyDefinitions[0];
  const variant =
    definition.variants.find(candidate => candidate.id === variantId) ?? definition.variants[0];
  return { definition, variant };
}

export function requestNeedsTransaction(request: JourneyRequest) {
  return (
    (request.kind === 'transaction' || request.kind === 'psbt') && request.mode === 'broadcast'
  );
}
