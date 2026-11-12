export type ApprovalAnswer = 'yes' | 'no' | 'partial' | 'n.a.';
export type ApprovalScreenStatus = 'live' | 'gated' | 'deprecated';

export const approvalQuestions = [
  { key: 'showsDomain', label: 'Shows requesting domain' },
  { key: 'walletTitle', label: 'Title set by wallet' },
  { key: 'showsNetwork', label: 'Shows network' },
  { key: 'feeIsSigned', label: 'Fee shown is the fee signed' },
  { key: 'amountsUnrounded', label: 'Amounts unrounded' },
  { key: 'rawPayload', label: 'Raw payload viewable' },
] as const;

export type ApprovalQuestionKey = (typeof approvalQuestions)[number]['key'];

export interface ApprovalScreen {
  shot: string;
  title: string;
  method: string;
  status: ApprovalScreenStatus;
  note: string;
  answers: Record<ApprovalQuestionKey, ApprovalAnswer>;
}

interface ApprovalLayout {
  id: string;
  title: string;
  description: string;
  screens: ApprovalScreen[];
}

export const approvalLayouts: ApprovalLayout[] = [
  {
    id: 'approver',
    title: 'Approver transaction layout',
    description:
      'RpcTransactionRequestLayout and the send-transfer page, both built on the Approver from @leather.io/ui: wallet-set title, a Requested by line, account card, details and a fixed action bar.',
    screens: [
      {
        shot: '01-stx-call-contract',
        title: 'Contract call',
        method: 'stx_callContract',
        status: 'live',
        note: 'Shows post conditions, the signing account, contract address, name, function and decoded arguments, then fee and nonce. The Requested by line shows the hostname without its port (localhost, not localhost:3000). No network is stated anywhere, and Total spend ignores any STX the contract may move.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'n.a.',
          rawPayload: 'partial',
        },
      },
      {
        shot: '02-stx-call-contract-allow-mode',
        title: 'Contract call, allow mode',
        method: 'stx_callContract',
        status: 'live',
        note: 'In allow mode the warning replaces the post-conditions list entirely, so the screen says the contract can move anything but never which assets it intends to move.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'n.a.',
          rawPayload: 'partial',
        },
      },
      {
        shot: '03-stx-deploy-contract',
        title: 'Deploy contract',
        method: 'stx_deployContract',
        status: 'live',
        note: 'Shows the deploying address, contract name and the full highlighted Clarity source, so the payload is fully readable. No network is shown.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'n.a.',
          rawPayload: 'yes',
        },
      },
      {
        shot: '04-stx-sign-transaction-single-sig',
        title: 'Sign transaction, single-sig',
        method: 'stx_signTransaction',
        status: 'live',
        note: 'A 1,234,567.89 STX transfer renders as 1.23M STX. Total spend reads <$0.01 because it only counts the fee, and the insufficient-balance error replaces both buttons. The fee row overrides the fee in the request.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'no',
          rawPayload: 'no',
        },
      },
      {
        shot: '05-stx-sign-transaction-single-sig-within-balance',
        title: 'Sign transaction, within balance',
        method: 'stx_signTransaction',
        status: 'live',
        note: 'The same screen with a 0.0005 STX transfer: exact amount, fee and nonce rows, and Approve enabled. The raw transaction hex is never shown.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'yes',
          rawPayload: 'no',
        },
      },
      {
        shot: '06-stx-sign-transaction-multisig',
        title: 'Multisig co-sign',
        method: 'stx_signTransaction',
        status: 'live',
        note: 'Multisig co-sign shows no fee or nonce row at all: the fee in the request is signed as is, but the screen never says what it is.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'no',
          amountsUnrounded: 'yes',
          rawPayload: 'no',
        },
      },
      {
        shot: '07-stx-transfer-stx-large-amount',
        title: 'Send STX, large amount',
        method: 'stx_transferStx',
        status: 'live',
        note: 'Amounts above one million render in compact notation (1.23M STX), so the exact amount being signed is not on screen. The memo row reads No memo when the request has none.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'no',
          rawPayload: 'no',
        },
      },
      {
        shot: '08-stx-transfer-stx-within-balance',
        title: 'Send STX, within balance',
        method: 'stx_transferStx',
        status: 'live',
        note: 'A 0.0001 STX transfer with a memo: exact amount, memo, fee and nonce.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'yes',
          rawPayload: 'no',
        },
      },
      {
        shot: '09-send-transfer',
        title: 'Send BTC',
        method: 'sendTransfer',
        status: 'live',
        note: 'A testnet4 request: the only hint of the network is the tb1 address prefix. A Taproot warning leads when inputs come from a Taproot address, and the action bar breaks the spend down per address type.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          amountsUnrounded: 'yes',
          rawPayload: 'no',
        },
      },
    ],
  },
  {
    id: 'connect',
    title: 'Connect account layout',
    description:
      'ConnectAccountLayout, used by getAddresses: its own logo, favicon, permission list and Deny / Confirm buttons, on the shared Approver header.',
    screens: [
      {
        shot: '10-get-addresses',
        title: 'Connect app',
        method: 'getAddresses',
        status: 'live',
        note: 'Shows the requesting hostname, the account with its total balance across chains and the two permissions granted. It does not say which network the addresses are for.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'n.a.',
          amountsUnrounded: 'n.a.',
          rawPayload: 'n.a.',
        },
      },
    ],
  },
  {
    id: 'message-signing',
    title: 'Message signing layout',
    description:
      'The older message-signing screens built on MessageSigningHeader: account switcher on top, inline Cancel / Sign buttons and a disclaimer below.',
    screens: [
      {
        shot: '11-stx-sign-message',
        title: 'Sign Stacks message',
        method: 'stx_signMessage',
        status: 'live',
        note: 'The only layout that states the network: Mainnet sits next to No fees are incurred, and the header adds the API host on testnet. The header shows the full origin with its port and the hostname, then the message and a Show hash toggle.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'yes',
          feeIsSigned: 'n.a.',
          amountsUnrounded: 'n.a.',
          rawPayload: 'yes',
        },
      },
      {
        shot: '12-sign-message-bip322',
        title: 'Sign Bitcoin message (BIP-322)',
        method: 'signMessage',
        status: 'live',
        note: 'The same header with the signing address appended, truncated in the middle. The message is shown in full; there is no hash toggle.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'yes',
          feeIsSigned: 'n.a.',
          amountsUnrounded: 'n.a.',
          rawPayload: 'yes',
        },
      },
    ],
  },
];

interface UncapturedScreen {
  title: string;
  method: string;
  status: ApprovalScreenStatus;
  reason: string;
}

export const uncapturedScreens: UncapturedScreen[] = [
  {
    title: 'Sign PSBT',
    method: 'signPsbt',
    status: 'live',
    reason:
      'Needs a funded wallet from EXTENSION_INTEGRATION_TEST_MNEMONIC, which the screenshot spec does not use.',
  },
  {
    title: 'Add account',
    method: 'btc_addAccount, stx_addAccount',
    status: 'live',
    reason:
      'Left out of this capture set: the verify and register approvers need multisig policy fixtures, which rpc-add-account.spec.ts drives on its own.',
  },
];

export const usageEvents = [
  {
    name: 'rpc_request_successful',
    description:
      'Sent with the RPC method as endpoint, so it counts how often each approval screen above opens.',
  },
  {
    name: 'rpc_request_error',
    description:
      'Sent with the method and the error when a request is rejected before a screen opens.',
  },
];
