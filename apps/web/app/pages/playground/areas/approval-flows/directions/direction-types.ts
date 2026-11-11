import type { ComponentType, ReactNode } from 'react';

import type { ApprovalRequest } from '../scenarios/approval-model';

export interface DirectionHeaderProps {
  request: ApprovalRequest;
  interactive: boolean;
  replayKey: string;
}

export interface DirectionRowsProps {
  request: ApprovalRequest;
}

export interface DirectionSectionProps {
  title: string;
  children: ReactNode;
}

export interface ApprovalDirection {
  id: string;
  label: string;
  summary: string;
  status: 'focused' | 'reference';
  Header: ComponentType<DirectionHeaderProps>;
  Rows: ComponentType<DirectionRowsProps>;
  Section: ComponentType<DirectionSectionProps>;
}
