import { makeStacksPolicy, policyStateOverrides } from '@tests/mocks/mock-policies';
import type { GlobalPage } from '@tests/page-object-models/global.page';
import type { HomePage } from '@tests/page-object-models/home.page';
import {
  type OnboardingPage,
  getConnectedTestAppPermissionsState,
  makeLedgerTestAccountWalletState,
} from '@tests/page-object-models/onboarding.page';

import type { VerifyRun } from '@leather.io/tools/verify-contract';

const mainnet = 'mainnet';

export interface VerifySessionPages {
  readonly extensionId: string;
  readonly globalPage: GlobalPage;
  readonly homePage: HomePage;
  readonly onboardingPage: OnboardingPage;
}

function networkOverrides(network: string) {
  if (network === mainnet) return {};
  return { networks: { ids: [], entities: {}, currentNetworkId: network } };
}

function connectionOverrides(connect: boolean, policyId?: string) {
  return connect ? getConnectedTestAppPermissionsState({ policyId }) : {};
}

async function signIn(run: VerifyRun, pages: VerifySessionPages) {
  const { extensionId, onboardingPage } = pages;
  if (run.accountType === 'ledger') {
    await onboardingPage.signInWithLedgerAccount(extensionId, {
      ...makeLedgerTestAccountWalletState(['bitcoin', 'stacks']),
      ...connectionOverrides(run.connectTestApp),
    });
    return;
  }
  if (run.accountType === 'mixed') {
    await onboardingPage.signInWithMixedSoftwareAndLedgerWallets(
      extensionId,
      connectionOverrides(run.connectTestApp)
    );
    return;
  }
  if (run.accountType === 'policy') {
    const policy = makeStacksPolicy();
    await onboardingPage.signInWithTestAccount(extensionId, {
      ...policyStateOverrides({ policies: [policy], activePolicyId: policy.id }),
      ...connectionOverrides(run.connectTestApp, policy.id),
    });
    return;
  }
  await onboardingPage.signInWithTestAccount(extensionId, {
    ...networkOverrides(run.network),
    ...connectionOverrides(run.connectTestApp),
  });
}

export async function seedVerifySession(run: VerifyRun, pages: VerifySessionPages) {
  await pages.globalPage.gotoNakedRoot(pages.extensionId);
  if (run.session === 'signed-out') return;
  await signIn(run, pages);
  if (run.session === 'locked') await pages.homePage.lock();
}
