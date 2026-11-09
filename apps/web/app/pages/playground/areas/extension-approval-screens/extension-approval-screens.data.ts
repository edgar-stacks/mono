export type ScreenStatus = 'live' | 'gated' | 'deprecated';

export type Answer = 'yes' | 'no' | 'partial' | 'n.a.';

export const approvalQuestions = [
  { id: 'requestingDomain', label: 'Shows requesting domain' },
  { id: 'walletTitle', label: 'Title set by wallet' },
  { id: 'network', label: 'Shows network' },
  { id: 'feeSigned', label: 'Fee shown is the fee signed' },
  { id: 'unroundedAmounts', label: 'Amounts unrounded' },
  { id: 'rawPayload', label: 'Raw payload viewable' },
] as const;

export type QuestionId = (typeof approvalQuestions)[number]['id'];

export const approvalLayouts = [
  {
    id: 'transaction',
    title: 'Transaction approver',
    description:
      'Approver inside TransactionWrapper: header with the requesting hostname, sections, and a fixed footer with the total spend and the actions. Every stx_* transaction method and sendTransfer use it.',
  },
  {
    id: 'connect',
    title: 'Connect app',
    description:
      'ConnectAccountLayout: the same Approver header, the account switcher and the two permissions, with Deny and Confirm.',
  },
  {
    id: 'message',
    title: 'Message signing',
    description:
      'MessageSigningRequestLayout under the popup header: MessageSigningHeader, the message, the no-fees row with the network, and inline actions.',
  },
] as const;

type LayoutId = (typeof approvalLayouts)[number]['id'];

export interface ApprovalScreen {
  id: string;
  shot: string;
  method: string;
  name: string;
  layout: LayoutId;
  status: ScreenStatus;
  note: string;
  answers: Record<QuestionId, Answer>;
}

export const approvalScreens: ApprovalScreen[] = [
  {
    id: 'stx-call-contract',
    shot: '01-stx-call-contract.png',
    method: 'stx_callContract',
    name: 'Contract call',
    layout: 'transaction',
    status: 'live',
    note: 'Shows the contract, function and decoded arguments, the post conditions, fee and nonce. The title is Sign contract without post conditions and Sign transaction with them, so the request decides it. Leaves out the network and the raw transaction.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'partial',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'n.a.',
      rawPayload: 'partial',
    },
  },
  {
    id: 'stx-call-contract-allow-mode',
    shot: '02-stx-call-contract-allow-mode.png',
    method: 'stx_callContract',
    name: 'Contract call, allow mode',
    layout: 'transaction',
    status: 'live',
    note: 'In allow mode the warning "This transaction can transfer any of your assets" replaces the post-conditions list; the rest matches the contract call.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'partial',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'n.a.',
      rawPayload: 'partial',
    },
  },
  {
    id: 'stx-deploy-contract',
    shot: '03-stx-deploy-contract.png',
    method: 'stx_deployContract',
    name: 'Deploy contract',
    layout: 'transaction',
    status: 'live',
    note: 'Shows the deployer address, the contract name and the full Clarity code, then fee and nonce. Leaves out the network and the Clarity version.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'n.a.',
      rawPayload: 'yes',
    },
  },
  {
    id: 'stx-sign-transaction-single-sig',
    shot: '04-stx-sign-transaction-single-sig.png',
    method: 'stx_signTransaction',
    name: 'Sign transaction, single-sig',
    layout: 'transaction',
    status: 'live',
    note: 'The balance is read for the transaction sender, while the card names the current account. With an unfunded sender the actions give way to "Available balance insufficient". The fee and nonce in the request are replaced by the ones shown.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'yes',
      rawPayload: 'no',
    },
  },
  {
    id: 'stx-sign-transaction-within-balance',
    shot: '05-stx-sign-transaction-within-balance.png',
    method: 'stx_signTransaction',
    name: 'Sign transaction, within balance',
    layout: 'transaction',
    status: 'live',
    note: 'The same request with a funded sender: amount, recipient, fee and nonce, and Approve. The total spend counts the fee only, because the amount is not added yet.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'yes',
      rawPayload: 'no',
    },
  },
  {
    id: 'stx-sign-transaction-multisig',
    shot: '06-stx-sign-transaction-multisig.png',
    method: 'stx_signTransaction',
    name: 'Sign transaction, multisig co-sign',
    layout: 'transaction',
    status: 'live',
    note: 'A multisig spending condition shows no fee or nonce row: the fee and nonce in the request are signed as they are, without being shown.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'no',
      unroundedAmounts: 'yes',
      rawPayload: 'no',
    },
  },
  {
    id: 'stx-transfer-stx-large-amount',
    shot: '07-stx-transfer-stx-large-amount.png',
    method: 'stx_transferStx',
    name: 'Send STX, large amount',
    layout: 'transaction',
    status: 'live',
    note: 'Amounts above one million render in compact notation (1.23M STX), so the exact amount being signed is not on screen.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'no',
      rawPayload: 'no',
    },
  },
  {
    id: 'stx-transfer-stx-within-balance',
    shot: '08-stx-transfer-stx-within-balance.png',
    method: 'stx_transferStx',
    name: 'Send STX, within balance',
    layout: 'transaction',
    status: 'live',
    note: 'Amount, recipient, memo (No memo when empty), fee and nonce. The fee row opens the fee editor and the chosen fee is the one broadcast.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'yes',
      unroundedAmounts: 'yes',
      rawPayload: 'no',
    },
  },
  {
    id: 'send-transfer',
    shot: '09-send-transfer.png',
    method: 'sendTransfer',
    name: 'Send bitcoin',
    layout: 'transaction',
    status: 'live',
    note: 'Requested on testnet4, yet only the tb1 address prefix hints at the network. Shows the Taproot callout when Taproot coins are spent and splits the spend by address type in the footer.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'partial',
      feeSigned: 'yes',
      unroundedAmounts: 'yes',
      rawPayload: 'no',
    },
  },
  {
    id: 'get-addresses',
    shot: '10-get-addresses.png',
    method: 'getAddresses',
    name: 'Connect app',
    layout: 'connect',
    status: 'live',
    note: 'The account to share and the two permissions. Leaves out which addresses and which network the app receives.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'no',
      feeSigned: 'n.a.',
      unroundedAmounts: 'n.a.',
      rawPayload: 'n.a.',
    },
  },
  {
    id: 'stx-sign-message',
    shot: '11-stx-sign-message.png',
    method: 'stx_signMessage',
    name: 'Sign Stacks message',
    layout: 'message',
    status: 'live',
    note: 'The only header that states the network: the no-fees row names it, and on testnet the caption adds the node host. The message is shown in full with its hash behind a toggle.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'yes',
      feeSigned: 'n.a.',
      unroundedAmounts: 'n.a.',
      rawPayload: 'yes',
    },
  },
  {
    id: 'sign-message-bip322',
    shot: '12-sign-message-bip322.png',
    method: 'signMessage',
    name: 'Sign bitcoin message (BIP-322)',
    layout: 'message',
    status: 'live',
    note: 'Same layout, with the signing address appended to the caption and no hash toggle.',
    answers: {
      requestingDomain: 'yes',
      walletTitle: 'yes',
      network: 'yes',
      feeSigned: 'n.a.',
      unroundedAmounts: 'n.a.',
      rawPayload: 'yes',
    },
  },
];

export const uncapturedScreens: {
  method: string;
  status: ScreenStatus;
  reason: string;
}[] = [
  {
    method: 'signPsbt',
    status: 'live',
    reason:
      'Signing needs a real wallet, so the spec would need EXTENSION_INTEGRATION_TEST_MNEMONIC.',
  },
  {
    method: 'stx_addAccount, btc_addAccount',
    status: 'gated',
    reason: 'The add-account screens do not render with releaseAddAccount off.',
  },
];

export const usageEvents = [
  {
    name: 'rpc_request_successful',
    description: 'Sent by the background when it accepts a request, with the method as endpoint.',
  },
];
