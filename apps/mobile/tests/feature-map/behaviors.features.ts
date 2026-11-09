import { AppRoutes } from '@/shared/app-routes';
import { AppUpdateSelectors } from '@/shared/selectors/app-update.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';

export const behaviorsFeatures = [
  {
    id: 'app-unlock',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    open: ['unlock'],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Turn on app authentication in Settings › Security',
          'Background the app or relaunch it; the splash overlay locks the app until the device passcode or biometrics pass',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'locked', accountType: 'software', mocks: [] },
    selectors: { others: [SharedSelectors.SplashOverlay, SharedSelectors.UnlockButton] },
    actions: ['unlock'],
    specs: [unlockFlow],
    description:
      'SplashScreenGuard (components/splash-screen-guard/splash-screen-guard.tsx) wraps every screen: it plays the splash animation, and with securityLevelPreference "secure" asks for device authentication on open and on return from background, keeping a full-screen overlay until it passes. A failed attempt shows t`Unlock` to retry. Without security it bypasses authentication and only plays the splash.',
  },
  {
    id: 'version-guard',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Set the minimum_app_version flag above the installed version and launch the app'],
      },
    ],
    gate: 'none',
    flags: ['minimum_app_version'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { others: [AppUpdateSelectors.UpdateButton] },
    actions: [],
    specs: [],
    description:
      'VersionGuard (components/version-guard/version-guard.tsx) runs in the root layout and compares the installed version with minimum_app_version (hooks/use-version-check.ts); an empty flag skips the check and errors are reported to Sentry and ignored. When an update is needed it presents app-update-required-sheet.',
  },
  {
    id: 'toast',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Trigger a toast, for example copy an address from the receive sheet'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [SharedSelectors.ToastContainer] },
    actions: [],
    specs: [],
    description:
      'Toasts (components/toast/toast-context.tsx and toast.tsx) are shown above every screen by ToastWrapper in the root layout after actions such as copying an address, changing network or approving a request, and hide themselves after a short delay.',
  },
  {
    id: 'privacy-mode',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['On home tap the eye icon in the header'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [HomeSelectors.PrivacyButton] },
    actions: [],
    specs: [],
    description:
      'Privacy mode (components/screen/screen-header/components/header-actions.tsx) toggles privacyModePreference between visible and hidden; t`Hide balances` masks every balance rendered through components/private-text.tsx across the app, t`Show balances` restores them. The toggle shows only when a wallet exists.',
  },
] as const satisfies readonly MobileFeatureEntry[];
