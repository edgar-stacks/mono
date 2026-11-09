export const ActivitySelectors = {
  ActivityList: 'activity-list',
  ActivityItemMenu: 'activity-item-menu',
  ActivityItemMenuBtn: 'activity-item-menu-btn',
  ActivityItemMenuIncreaseFee: 'activity-item-menu-increase-fee',
  ActivityItemMenuCancelTransaction: 'activity-item-menu-cancel-transaction',

  ActivityDetails: 'activity-details',
  ActivityDetailsTitle: 'activity-details-title',
  ActivityDetailsBackBtn: 'activity-details-back',
  ActivityDetailsHero: 'activity-details-hero',
  ActivityDetailsBalanceChanges: 'activity-details-balance-changes',
  ActivityDetailsExplorerBtn: 'activity-details-explorer-btn',
  ActivityDetailsLoading: 'activity-details-loading',
  ActivityDetailsNotFound: 'activity-details-not-found',

  TransactionActionBalance: 'transaction-action-balance',
  TransactionActionFeeInput: 'transaction-action-fee-input',
  TransactionActionSheet: 'transaction-action-sheet',
  TransactionSubmitAction: 'transaction-submit-action',
} as const;
export type ActivitySelectors = (typeof ActivitySelectors)[keyof typeof ActivitySelectors];
