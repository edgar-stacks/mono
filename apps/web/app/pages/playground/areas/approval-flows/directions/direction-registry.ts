type ApprovalDirectionId =
  | 'handshake'
  | 'baseline'
  | 'activity'
  | 'breakdown'
  | 'balance'
  | 'receipt'
  | 'tactile'
  | 'phantom';

type ApprovalHeaderStyle = 'handshake' | 'plain' | 'hero-amount';

export type ApprovalRowsStyle = 'list' | 'card' | 'receipt';

type ApprovalExtraBlock = 'none' | 'balance-impact' | 'activity-preview';

export interface ApprovalDirection {
  id: ApprovalDirectionId;
  label: string;
  summary: string;
  isFocused: boolean;
  isDiscarded: boolean;
  header: ApprovalHeaderStyle;
  rows: ApprovalRowsStyle;
  extra: ApprovalExtraBlock;
  holdToApprove: boolean;
}

export const approvalDirections: [ApprovalDirection, ...ApprovalDirection[]] = [
  {
    id: 'handshake',
    label: 'Handshake',
    summary:
      'Requester and signer meet at the top; amounts, limits and fees follow in one list, with the request’s effect stated before the button.',
    isFocused: true,
    isDiscarded: false,
    header: 'handshake',
    rows: 'list',
    extra: 'none',
    holdToApprove: false,
  },
  {
    id: 'baseline',
    label: 'Baseline',
    summary: 'The current extension structure with the new building blocks dropped in.',
    isFocused: false,
    isDiscarded: true,
    header: 'plain',
    rows: 'list',
    extra: 'none',
    holdToApprove: false,
  },
  {
    id: 'activity',
    label: 'Activity',
    summary: 'Previews the Activity row the request will create.',
    isFocused: false,
    isDiscarded: true,
    header: 'plain',
    rows: 'list',
    extra: 'activity-preview',
    holdToApprove: false,
  },
  {
    id: 'breakdown',
    label: 'Breakdown',
    summary: 'Groups movements, limits and fees into separate cards.',
    isFocused: false,
    isDiscarded: true,
    header: 'plain',
    rows: 'card',
    extra: 'none',
    holdToApprove: false,
  },
  {
    id: 'balance',
    label: 'Balance',
    summary: 'Shows the account balance before and after the request.',
    isFocused: false,
    isDiscarded: true,
    header: 'plain',
    rows: 'list',
    extra: 'balance-impact',
    holdToApprove: false,
  },
  {
    id: 'receipt',
    label: 'Receipt',
    summary: 'Lays the request out as a receipt with a total line.',
    isFocused: false,
    isDiscarded: true,
    header: 'plain',
    rows: 'receipt',
    extra: 'none',
    holdToApprove: false,
  },
  {
    id: 'tactile',
    label: 'Tactile',
    summary: 'Asks for a press-and-hold to approve.',
    isFocused: false,
    isDiscarded: true,
    header: 'handshake',
    rows: 'list',
    extra: 'none',
    holdToApprove: true,
  },
  {
    id: 'phantom',
    label: 'Phantom',
    summary: 'Leads with a large amount and pushes details below.',
    isFocused: false,
    isDiscarded: true,
    header: 'hero-amount',
    rows: 'card',
    extra: 'none',
    holdToApprove: false,
  },
];

export function getApprovalDirection(id: string | null | undefined): ApprovalDirection {
  return approvalDirections.find(direction => direction.id === id) ?? approvalDirections[0];
}
