import { test } from '@tests/fixtures/fixtures';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { readVerifyPlanEnv, verifyArtifacts } from '@leather.io/tools/verify-contract';

import { runVerify } from './verify-run';

const setupMarginMs = 120_000;
const timeoutBudgets = 3;

function requireVerifyEnv() {
  const verifyEnv = readVerifyPlanEnv(process.env);
  if (!verifyEnv.ok) throw new Error(verifyEnv.error);
  return verifyEnv;
}

test.describe('Verify a feature-map screen', () => {
  test('opens the screen under its preconditions and writes the evidence', async ({
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
    const { plan, outDir } = requireVerifyEnv();
    test.setTimeout(plan.timeoutMs * timeoutBudgets + setupMarginMs);
    const summary = await runVerify(
      {
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
      },
      plan,
      outDir
    );
    test.expect(summary.artifacts).toContain(verifyArtifacts.summary);
    test.expect(existsSync(path.join(outDir, verifyArtifacts.summary))).toBe(true);
  });
});
