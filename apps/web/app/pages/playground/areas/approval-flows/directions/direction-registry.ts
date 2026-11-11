import { ActivityHeader, ActivityRows, ActivitySection } from './activity/activity-direction';
import { BalanceHeader, BalanceRows, BalanceSection } from './balance/balance-direction';
import { BaselineHeader, BaselineRows, BaselineSection } from './baseline/baseline-direction';
import { BreakdownHeader, BreakdownRows, BreakdownSection } from './breakdown/breakdown-direction';
import type { ApprovalDirection } from './direction-types';
import { HandshakeHeader } from './handshake/handshake-header';
import { HandshakeRows } from './handshake/handshake-rows';
import { HandshakeSection } from './handshake/handshake-section';
import { PhantomHeader, PhantomRows, PhantomSection } from './phantom/phantom-direction';
import { ReceiptHeader, ReceiptRows, ReceiptSection } from './receipt/receipt-direction';
import { TactileHeader, TactileRows, TactileSection } from './tactile/tactile-direction';

const defaultDirectionId = 'handshake';

export const approvalDirections: ApprovalDirection[] = [
  {
    id: 'handshake',
    label: 'Handshake',
    summary:
      'Requester and wallet meet at the top; the signing account, funds, limits and fee sit in labelled cards, with what happens next above the buttons.',
    status: 'focused',
    Header: HandshakeHeader,
    Rows: HandshakeRows,
    Section: HandshakeSection,
  },
  {
    id: 'baseline',
    label: 'Baseline',
    summary: 'Today’s structure: title, origin and a flat list of rows.',
    status: 'reference',
    Header: BaselineHeader,
    Rows: BaselineRows,
    Section: BaselineSection,
  },
  {
    id: 'activity',
    label: 'Activity',
    summary: 'Movements drawn as the Activity rows they will become.',
    status: 'reference',
    Header: ActivityHeader,
    Rows: ActivityRows,
    Section: ActivitySection,
  },
  {
    id: 'breakdown',
    label: 'Breakdown',
    summary: 'Value in, value out and net, as a statement.',
    status: 'reference',
    Header: BreakdownHeader,
    Rows: BreakdownRows,
    Section: BreakdownSection,
  },
  {
    id: 'balance',
    label: 'Balance',
    summary: 'Each moved asset shows the balance after approval.',
    status: 'reference',
    Header: BalanceHeader,
    Rows: BalanceRows,
    Section: BalanceSection,
  },
  {
    id: 'receipt',
    label: 'Receipt',
    summary: 'A printed receipt with the method and dashed sections.',
    status: 'reference',
    Header: ReceiptHeader,
    Rows: ReceiptRows,
    Section: ReceiptSection,
  },
  {
    id: 'tactile',
    label: 'Tactile',
    summary: 'Raised cards with a pressed requester header.',
    status: 'reference',
    Header: TactileHeader,
    Rows: TactileRows,
    Section: TactileSection,
  },
  {
    id: 'phantom',
    label: 'Phantom',
    summary: 'A hero amount first, details second.',
    status: 'reference',
    Header: PhantomHeader,
    Rows: PhantomRows,
    Section: PhantomSection,
  },
];

export function findDirection(id: string | null | undefined): ApprovalDirection {
  return (
    approvalDirections.find(direction => direction.id === id) ??
    approvalDirections.find(direction => direction.id === defaultDirectionId) ??
    approvalDirections[0]
  );
}
