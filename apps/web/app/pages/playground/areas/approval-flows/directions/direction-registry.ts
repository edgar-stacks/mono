export type DirectionHeader =
  | 'handshake'
  | 'title'
  | 'activity'
  | 'balance'
  | 'receipt'
  | 'simulation';

export interface ApprovalDirection {
  id: string;
  label: string;
  summary: string;
  status: 'focused' | 'discarded';
  header: DirectionHeader;
  groupedRows: boolean;
  confirm: 'tap' | 'hold';
}

export const approvalDirections: ApprovalDirection[] = [
  {
    id: 'handshake',
    label: 'Handshake',
    summary:
      'The requester and the signing account meet in the header, then amount, limits and fee follow in one column.',
    status: 'focused',
    header: 'handshake',
    groupedRows: true,
    confirm: 'tap',
  },
  {
    id: 'baseline',
    label: 'Baseline',
    summary: 'The current extension layout with the new rows dropped in.',
    status: 'discarded',
    header: 'title',
    groupedRows: false,
    confirm: 'tap',
  },
  {
    id: 'activity',
    label: 'Activity',
    summary: 'Leads with the Activity row the request will become.',
    status: 'discarded',
    header: 'activity',
    groupedRows: true,
    confirm: 'tap',
  },
  {
    id: 'breakdown',
    label: 'Breakdown',
    summary: 'Every row stays flat and labelled, closest to a statement.',
    status: 'discarded',
    header: 'title',
    groupedRows: false,
    confirm: 'tap',
  },
  {
    id: 'balance',
    label: 'Balance',
    summary: 'Leads with the account balance before and after.',
    status: 'discarded',
    header: 'balance',
    groupedRows: true,
    confirm: 'tap',
  },
  {
    id: 'receipt',
    label: 'Receipt',
    summary: 'Frames the request as a receipt to sign.',
    status: 'discarded',
    header: 'receipt',
    groupedRows: false,
    confirm: 'tap',
  },
  {
    id: 'tactile',
    label: 'Tactile',
    summary: 'Handshake structure with hold-to-approve.',
    status: 'discarded',
    header: 'handshake',
    groupedRows: true,
    confirm: 'hold',
  },
  {
    id: 'phantom',
    label: 'Phantom',
    summary: 'Leads with a simulated result of the request.',
    status: 'discarded',
    header: 'simulation',
    groupedRows: true,
    confirm: 'tap',
  },
];

const defaultDirectionId = 'handshake';

export function resolveDirection(id: string | null) {
  return (
    approvalDirections.find(direction => direction.id === id) ??
    approvalDirections.find(direction => direction.id === defaultDirectionId) ??
    approvalDirections[0]
  );
}
