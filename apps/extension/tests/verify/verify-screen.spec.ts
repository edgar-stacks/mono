import { verifyRunFromEnv } from '@leather.io/tools/verify-contract';

import { test } from '../fixtures/fixtures';
import { runVerify } from './verify-runner';

test.describe('Verify: feature-map screen', () => {
  test('opens the screen under its preconditions and records evidence', async ({
    context,
    page,
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
    swapRevampPage,
    networkPage,
    settingsPage,
    switchAccountPage,
  }) => {
    const run = verifyRunFromEnv(process.env);
    const summary = await runVerify(run, {
      context,
      page,
      extensionId,
      globalPage,
      homePage,
      onboardingPage,
      pageObjects: {
        GlobalPage: globalPage,
        HomePage: homePage,
        OnboardingPage: onboardingPage,
        SendPage: sendPage,
        SwapRevampPage: swapRevampPage,
        NetworkPage: networkPage,
        SettingsPage: settingsPage,
        SwitchAccountPage: switchAccountPage,
      },
    });
    test.expect(summary.findings, `evidence in ${run.outDir}`).toEqual([]);
  });
});
