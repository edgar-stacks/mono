export const MoveToFreshAccountSelectors = {
  MoveToFreshAccountPage: 'move-to-fresh-account-page',
  FreshAddress: 'move-to-fresh-account-address',
  NoFreshAccountWarning: 'move-to-fresh-account-unavailable',
  PlanError: 'move-to-fresh-account-plan-error',
  SubmitButton: 'move-to-fresh-account-submit-btn',
} as const;
export type MoveToFreshAccountSelectors =
  (typeof MoveToFreshAccountSelectors)[keyof typeof MoveToFreshAccountSelectors];
