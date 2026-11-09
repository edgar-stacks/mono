import type { JourneyFailure, JourneyStage } from '../journeys/journey-state';
import type { JourneyWalletKind } from '../journeys/journey-world';
import type { LedgerDeviceState } from '../pattern/approval-ledger-sheet';

type ApprovalSectionId =
  | 'connect'
  | 'messages'
  | 'transactions'
  | 'contract-calls'
  | 'vaults'
  | 'ledger'
  | 'outcomes';

export interface ApprovalSection {
  id: ApprovalSectionId;
  label: string;
}

export interface ApprovalScreen {
  id: string;
  section: ApprovalSectionId;
  title: string;
  summary: string;
  journeyId: string;
  variantId: string;
  wallet: JourneyWalletKind;
  stage: JourneyStage;
  failure?: JourneyFailure;
  ledgerState?: LedgerDeviceState;
  capture?: string;
  captureNote?: string;
  issues: string[];
}
