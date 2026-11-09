export const approvalQuestions = [
  { id: 'showsDomain', label: 'Shows requesting domain' },
  { id: 'walletTitle', label: 'Title set by wallet' },
  { id: 'showsNetwork', label: 'Shows network' },
  { id: 'feeIsSigned', label: 'Fee shown is the fee signed' },
  { id: 'unroundedAmounts', label: 'Amounts unrounded' },
  { id: 'rawPayload', label: 'Raw payload viewable' },
] as const;

export type ApprovalQuestionId = (typeof approvalQuestions)[number]['id'];

export type ApprovalAnswer = 'yes' | 'no' | 'partial' | 'n.a.';

export type ApprovalScreenStatus = 'live' | 'gated' | 'deprecated';

export interface ApprovalScreen {
  shot: string;
  title: string;
  method: string;
  status: ApprovalScreenStatus;
  note: string;
  answers: Record<ApprovalQuestionId, ApprovalAnswer>;
}

interface ApprovalLayout {
  id: string;
  title: string;
  description: string;
  screens: ApprovalScreen[];
}

interface UncapturedApprovalScreen {
  title: string;
  method: string;
  status: ApprovalScreenStatus;
  reason: string;
}

export const approvalLayouts: ApprovalLayout[] = [
  {
    id: 'stacks-transaction',
    title: 'Stacks transaction approver',
    description:
      'RpcTransactionRequestLayout: the Approver header, then sections chosen by each page, then a fixed action bar with "Total spend". The action bar is fixed to the 756px fold, so in these full-page captures it covers whatever sits behind it.',
    screens: [
      {
        shot: '01-stx-call-contract',
        title: 'Contract call',
        method: 'stx_callContract',
        status: 'live',
        note: 'Shows post conditions, the account, the contract address, contract and function names and every decoded argument. "Total spend" is fiat only, so the STX the call moves is not stated.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'partial',
          rawPayload: 'partial',
        },
      },
      {
        shot: '02-stx-call-contract-allow-mode',
        title: 'Contract call, allow mode',
        method: 'stx_callContract',
        status: 'live',
        note: 'The allow-mode warning replaces the post-conditions list, so any post conditions sent with the request are not shown.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'partial',
          rawPayload: 'partial',
        },
      },
      {
        shot: '03-stx-deploy-contract',
        title: 'Contract deploy',
        method: 'stx_deployContract',
        status: 'live',
        note: 'Shows the deployer address, the contract name and the full Clarity source with highlighting.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'n.a.',
          rawPayload: 'yes',
        },
      },
      {
        shot: '04-stx-sign-transaction-single-sig',
        title: 'Sign transaction, single-sig',
        method: 'stx_signTransaction',
        status: 'live',
        note: 'The balance is read for the transaction sender, not the signing account, so a transaction built for another key shows a zero balance and "Available balance insufficient" with no approve button.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'partial',
          rawPayload: 'no',
        },
      },
      {
        shot: '05-stx-sign-transaction-single-sig-within-balance',
        title: 'Sign transaction, within balance',
        method: 'stx_signTransaction',
        status: 'live',
        note: 'The same transfer built for the signing account. The fee editor replaces the fee in the request, and the transaction hex itself is never shown.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'partial',
          rawPayload: 'no',
        },
      },
      {
        shot: '06-stx-sign-transaction-multisig',
        title: 'Sign transaction, multisig',
        method: 'stx_signTransaction',
        status: 'live',
        note: 'Multisig co-sign shows no fee or nonce row: the fee in the request is signed as is, but the screen never states it.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'no',
          unroundedAmounts: 'partial',
          rawPayload: 'no',
        },
      },
      {
        shot: '07-stx-transfer-stx-large-amount',
        title: 'STX transfer, large amount',
        method: 'stx_transferStx',
        status: 'live',
        note: 'Amounts above one million render in compact notation ("1.23M STX"), so the exact amount being sent is not on screen.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'no',
          rawPayload: 'no',
        },
      },
      {
        shot: '08-stx-transfer-stx-within-balance',
        title: 'STX transfer, within balance',
        method: 'stx_transferStx',
        status: 'live',
        note: 'Shows the account, amount, recipient, memo, fee and nonce. Fiat captions round to the cent ("<$0.01").',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'partial',
          rawPayload: 'no',
        },
      },
    ],
  },
  {
    id: 'page-built-approver',
    title: 'Approver built per page',
    description:
      'Screens that compose the Approver component directly instead of the shared Stacks layout: the Bitcoin transfer and the connect screen.',
    screens: [
      {
        shot: '09-send-transfer',
        title: 'Bitcoin transfer',
        method: 'sendTransfer',
        status: 'live',
        note: 'Warns when Taproot coins are spent, splits "Total spend" by address type and shows the fee row. Testnet4 is only implied by the tb1 address.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'yes',
          unroundedAmounts: 'partial',
          rawPayload: 'no',
        },
      },
      {
        shot: '10-get-addresses',
        title: 'Connect app',
        method: 'getAddresses',
        status: 'live',
        note: 'Shows the account to connect and what the app may do. It does not list the addresses or chains the app will receive.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'no',
          feeIsSigned: 'n.a.',
          unroundedAmounts: 'n.a.',
          rawPayload: 'n.a.',
        },
      },
    ],
  },
  {
    id: 'message-signing',
    title: 'Message signing',
    description:
      'MessageSigningHeader with no Approver: the account card sits on top and the caption shows the full origin and its hostname. It is the only header that states the network, and only on testnet.',
    screens: [
      {
        shot: '11-stx-sign-message',
        title: 'Stacks message',
        method: 'stx_signMessage',
        status: 'live',
        note: 'Shows the message with an expandable hash, "No fees are incurred" and the network name next to it.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'yes',
          feeIsSigned: 'n.a.',
          unroundedAmounts: 'n.a.',
          rawPayload: 'yes',
        },
      },
      {
        shot: '12-sign-message-bip322',
        title: 'Bitcoin message (BIP-322)',
        method: 'signMessage',
        status: 'live',
        note: 'Same header and message card as the Stacks message.',
        answers: {
          showsDomain: 'yes',
          walletTitle: 'yes',
          showsNetwork: 'yes',
          feeIsSigned: 'n.a.',
          unroundedAmounts: 'n.a.',
          rawPayload: 'yes',
        },
      },
    ],
  },
];

export const uncapturedApprovalScreens: UncapturedApprovalScreen[] = [
  {
    title: 'Sign PSBT',
    method: 'signPsbt',
    status: 'live',
    reason:
      'Its spec signs with the wallet from EXTENSION_INTEGRATION_TEST_MNEMONIC; this capture runs without it.',
  },
  {
    title: 'Add Bitcoin account',
    method: 'btc_addAccount',
    status: 'live',
    reason: 'Needs a policy descriptor the active account co-signs; not captured in this pass.',
  },
  {
    title: 'Add Stacks account',
    method: 'stx_addAccount',
    status: 'live',
    reason: 'Needs a multisig key set the active account belongs to; not captured in this pass.',
  },
  {
    title: 'SIP-9 and SIP-10 transfers',
    method: 'stx_transferSip9Nft, stx_transferSip10Ft',
    status: 'live',
    reason: 'Built on the same Stacks transaction approver; not captured in this pass.',
  },
];

export const approvalAnalyticsEvents = ['rpc_request_successful', 'rpc_request_error'];
