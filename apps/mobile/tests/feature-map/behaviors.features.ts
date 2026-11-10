import { AppRoutes } from '@/shared/app-routes';
import { AppUpdateSelectors } from '@/shared/selectors/app-update.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const behaviorsFeatures = [
  {
    id: 'behaviors-app-lock',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'With security level "secure", cold-start the app or return to it more than 60 seconds after leaving',
          'Authenticate with the device; after a failure tap t`Unlock`',
          'Settings → t`Lock app` locks it manually',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'locked', mocks: [] },
    selectors: { others: [] },
    actions: ['apps/mobile/maestro/shared/unlock.yaml'],
    specs: ['apps/mobile/maestro/shared/unlock.yaml'],
    description:
      'SplashScreenGuard (components/splash-screen-guard/splash-screen-guard.tsx, rendered by src/app/_layout.tsx around every screen) covers the app with the locked splash until device authentication passes (use-auth-state.tsx). In "secure" mode it authenticates on open and on foreground unless the app was left less than 60 seconds ago (unlockTimeout); "insecure" mode bypasses it and only plays the splash. The shared Maestro sub-flow unlock.yaml types into the device passcode field.',
  },
  {
    id: 'behaviors-app-update-required',
    anchor: { kind: 'selectors', objects: ['AppUpdateSelectors'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Serve a minimum_app_version above the installed version; VersionGuard presents the sheet on launch',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['minimum_app_version'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: AppUpdateSelectors.UpdateButton,
      others: [AppUpdateSelectors.MaybeLaterButton],
    },
    actions: [],
    specs: [],
    description:
      'components/version-guard/version-guard.tsx compares the installed version with the minimum_app_version string flag (hooks/use-version-check.ts; an empty string skips the check) and presents AppUpdateRequiredSheet (components/app-update-required): t`Get the latest version of the Leather app`, an update button that opens the store and t`Maybe later`, which dismisses it. A failed check is reported to Sentry and lets the app continue. No spec covers it.',
  },
  {
    id: 'behaviors-store-migrations',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Upgrade from a build whose persisted Redux store has an older version'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [
      'apps/mobile/src/store/migrations/migrate-0-1-flatten-keychains.spec.ts',
      'apps/mobile/src/store/migrations/migrate-1-2-pad-fingerprints.spec.ts',
    ],
    description:
      'redux-persist migrations in src/store/migrations run before PersistGate renders the app: 0→1 flattens the keychains and 1→2 pads wallet fingerprints. A broken migration shows up as missing wallets or accounts after an upgrade.',
  },
  {
    id: 'behaviors-secure-store',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Create, restore or remove a wallet, or view its Secret Key'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [
      'apps/mobile/src/store/secure-store/mnemonic-store.spec.ts',
      'apps/mobile/src/store/secure-store/secure-store-access.spec.ts',
      'apps/mobile/src/store/secure-store/secure-store-keys.spec.ts',
      'apps/mobile/src/store/secure-store/temp-mnemonic-store.spec.ts',
    ],
    description:
      'Mnemonics and passphrases live in the device keychain through src/store/secure-store, keyed per wallet fingerprint and guarded by biometrics when the security level is "secure"; onboarding parks the new mnemonic in tempMnemonicStore until the wallet is written. Never log or toast their values.',
  },
  {
    id: 'behaviors-privacy-mode',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Tap the eye button in the Home header (HomeSelectors.PrivacyButton)'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: ['apps/mobile/src/store/settings/settings.read.spec.ts'],
    description:
      'header-actions.tsx toggles privacyModePreference between "visible" and "hidden" (labels t`Hide balances` / t`Show balances`); balances across the app render masked while hidden. The button shows only with at least one wallet. The unit spec covers the settings selectors.',
  },
  {
    id: 'behaviors-account-store',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Add, hide or rename accounts from wallet settings'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: ['apps/mobile/src/store/accounts/utils.spec.ts'],
    description:
      'Account records in src/store/accounts hold the name, icon and status ("active" or "hidden") per fingerprint and account index; hidden accounts drop out of the account selector and move to /settings/wallet/hidden-accounts. The unit spec covers the account id helpers.',
  },
] as const satisfies readonly MobileFeatureEntry[];
