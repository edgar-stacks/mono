export const ActivitySelectors = {
  ActivityList: 'activity-list',
  ActivityItemMenu: 'activity-item-menu',
  ActivityItemMenuBtn: 'activity-item-menu-btn',
  ActivityItemMenuIncreaseFee: 'activity-item-menu-increase-fee',
  ActivityItemMenuCancelTransaction: 'activity-item-menu-cancel-transaction',

  ActivityDetails: 'activity-details',
  ActivityDetailsTitle: 'activity-details-title',
  ActivityDetailsBackButton: 'activity-details-back',
  ActivityDetailsExplorerButton: 'activity-details-explorer-btn',

  TransactionActionBalance: 'transaction-action-balance',
  TransactionActionFeeInput: 'transaction-action-fee-input',
  TransactionActionSheet: 'transaction-action-sheet',
  TransactionSubmitAction: 'transaction-submit-action',
} as const;
export type ActivitySelectors = (typeof ActivitySelectors)[keyof typeof ActivitySelectors];
