import { ApprovalScreensPreviewSelectors } from '@tests/selectors/approval-screens-preview.selectors';

import { RouteUrls } from '@shared/route-urls';

import { test } from '../../fixtures/fixtures';

test.describe('Approval screens preview', () => {
  test.beforeEach(async ({ extensionId, globalPage, onboardingPage }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await onboardingPage.signInWithTestAccount(extensionId);
  });

  test('renders the live components page', async ({ extensionId, page }) => {
    await page.goto(
      `chrome-extension://${extensionId}/index.html#${RouteUrls.ApprovalScreensPreview}`
    );
    await test
      .expect(page.getByTestId(ApprovalScreensPreviewSelectors.Heading))
      .toHaveText('Approval screens — live components');
  });
});
