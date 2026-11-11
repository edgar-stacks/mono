export const MoveToFreshAccountSelectors = {
  MoveToFreshAccountMenuItem: 'move-to-fresh-account-menu-item',
  MoveToFreshAccountPage: 'move-to-fresh-account-page',
  MoveToFreshAccountNoFreshAccount: 'move-to-fresh-account-no-fresh-account',
  MoveToFreshAccountError: 'move-to-fresh-account-error',
  MoveToFreshAccountSubmitBtn: 'move-to-fresh-account-submit-btn',
} as const;
export type MoveToFreshAccountSelectors =
  (typeof MoveToFreshAccountSelectors)[keyof typeof MoveToFreshAccountSelectors];
