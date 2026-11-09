interface FlowRow {
  label: string;
  value: string;
}

interface FlowStep {
  title: string;
  caption: string;
  rows: FlowRow[];
  badge?: string;
  callout?: { title: string; body: string };
  actionLabel: string;
}

export interface SponsorshipFlow {
  id: string;
  title: string;
  description: string;
  steps: FlowStep[];
}

const recipient = 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR';
const feeRecipient = 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9';

export const sponsorshipFlows: SponsorshipFlow[] = [
  {
    id: 'sbtc-transfer',
    title: 'Send sBTC, pay the fee in sBTC',
    description:
      'Ships in the extension: one sponsored sbtc-token transfer-many call with two entries, the recipient and the fee recipient, guarded by one deny-mode post condition.',
    steps: [
      {
        title: 'Send form',
        caption:
          'The account holds sBTC but less STX than the lowest fee estimate, so the fee row switches to sBTC tiers.',
        badge: 'Sponsored',
        rows: [
          { label: 'Amount', value: '0.0005 sBTC' },
          { label: 'To', value: recipient },
          { label: 'Fee', value: 'Standard · 0.0000001 sBTC' },
          { label: 'Available', value: '0.5 sBTC' },
        ],
        actionLabel: 'Continue',
      },
      {
        title: 'Review',
        caption:
          'The quote converts the STX fee of the selected tier at satsPerStx, rounded up and clamped to the quote bounds.',
        rows: [
          { label: 'Total spend', value: '0.0005001 sBTC' },
          { label: 'Sending', value: '0.0005 sBTC' },
          { label: 'Fee', value: '0.0000001 sBTC' },
          { label: 'Memo', value: 'No memo' },
        ],
        actionLabel: 'Confirm and send transaction',
      },
      {
        title: 'Quote expired',
        caption:
          'An expired quote, quote_expired or stale_nonce re-quotes with a fresh nonce and asks the user to confirm again.',
        callout: {
          title: 'Fee quote updated',
          body: 'The previous fee quote expired. Review the updated sBTC fee and confirm again.',
        },
        rows: [
          { label: 'Total spend', value: '0.00050012 sBTC' },
          { label: 'Sending', value: '0.0005 sBTC' },
          { label: 'Fee', value: '0.00000012 sBTC' },
          { label: 'Memo', value: 'No memo' },
        ],
        actionLabel: 'Confirm and send transaction',
      },
      {
        title: 'Sent',
        caption:
          'The wallet signs and posts the transaction to the sponsor; the summary renders from the sponsored hex the sponsor returns.',
        rows: [
          { label: 'Status', value: 'Pending' },
          { label: 'Total spend', value: '0.00050012 sBTC' },
          { label: 'Sending', value: '0.0005 sBTC' },
          { label: 'Fee', value: '0.00000012 sBTC' },
        ],
        actionLabel: 'Start again',
      },
    ],
  },
  {
    id: 'contract-call-bundle',
    title: 'Planned: sponsor any contract call',
    description:
      'Not built. A two-transaction bundle: the user signs the contract call with a sponsored auth and a separate sBTC fee transfer, and the sponsor submits both.',
    steps: [
      {
        title: 'App request',
        caption: 'An app asks the wallet to call a contract while the account has no STX.',
        badge: 'Sponsored',
        rows: [
          { label: 'Contract', value: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.amm-pool' },
          { label: 'Function', value: 'swap-x-for-y' },
          { label: 'Fee', value: '0.00000025 sBTC' },
        ],
        actionLabel: 'Review bundle',
      },
      {
        title: 'Bundle review',
        caption: 'Both transactions are listed so the user sees exactly what they sign.',
        rows: [
          { label: '1 · Contract call', value: 'swap-x-for-y, sponsored' },
          { label: '2 · Fee transfer', value: `0.00000025 sBTC to ${feeRecipient}` },
        ],
        actionLabel: 'Sign both',
      },
      {
        title: 'Submitted',
        caption: 'The sponsor broadcasts the fee transfer and the call together.',
        rows: [
          { label: 'Status', value: 'Pending' },
          { label: 'Transactions', value: '2' },
        ],
        actionLabel: 'Start again',
      },
    ],
  },
];
