import { AppRoutes } from '@/shared/app-routes';
import { AppUpdateSelectors } from '@/shared/selectors/app-update.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';

export const behaviorsFeatures = [
  {
    id: 'app-update-required',
    anchor: { kind: 'selectors', objects: ['AppUpdateSelectors.Sheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set the minimum_app_version flag above the installed version',
          'Launch the app; VersionGuard presents the sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['minimum_app_version'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: AppUpdateSelectors.Sheet, others: [AppUpdateSelectors.UpdateAppButton] },
    actions: [],
    specs: [],
    description:
      'VersionGuard (components/version-guard) compares the installed version with the minimum_app_version string flag (use-version-check.ts; an empty string skips the check) and presents app-update-required-sheet.tsx: "Get the latest version of the Leather app", "Update the app to get access to the latest features.", "Update from <store>" (AppUpdateSelectors.UpdateAppButton, opens the store or shows "Unable to Open Store") and "Maybe later".',
  },
  {
    id: 'app-lock',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Enable app authentication in Settings, Security',
          'Send the app to the background and reopen it',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'locked', mocks: [] },
    selectors: { others: [SettingsSelectors.LockAppButton] },
    actions: [unlockFlow],
    specs: [unlockFlow, 'apps/mobile/src/store/secure-store/secure-store-access.spec.ts'],
    description:
      'SplashScreenGuard (components/splash-screen-guard/splash-screen-guard.tsx with use-auth-state.tsx) wraps every screen in the root layout. It hides the native splash screen behind the animated Leather splash and, when the security preference is secure, asks for biometrics or the device PIN on launch and on return from the background, locking again when the app goes to the background. After a failed attempt it shows "Unlock" to retry; reading the keys prompts "Allow app to access secure storage". "Lock app" in Settings locks immediately. maestro/shared/unlock.yaml types into the "Passcode field" when it shows.',
  },
  {
    id: 'privacy-mode',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['On Home tap the eye icon'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [HomeSelectors.PrivacyButton] },
    actions: [],
    specs: [],
    description:
      'The eye icon in the home header (HomeSelectors.PrivacyButton, header-actions.tsx; labels "Hide balances" and "Show balances") toggles privacyModePreference, which masks balances across the app. It only shows once a wallet exists.',
  },
  {
    id: 'toast',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Trigger any action with feedback, such as copying an address on the receive sheet',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [SharedSelectors.ToastContainer] },
    actions: [],
    specs: [],
    description:
      'Toasts (components/toast) render in ToastWrapper above every screen with SharedSelectors.ToastContainer; displayToast({ title, type }) from useToastContext shows them, for example "Address copied", "Changed network" or "Wallet added".',
  },
  {
    id: 'deep-linking',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open leather:///settings/networks (or any route) from outside the app'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'The app registers the leather scheme (app.config.ts) without custom Linking handling, so expo-router maps leather://<path> to the screen file at that path (see each route entry). /browser?url=<url> opens a page in the in-app browser. Screens marked not deep-linkable read params or sheet state their caller passes and break from a bare link; send, receive, swap, ramp and the approvers live in sheets and have no link.',
  },
  {
    id: 'in-app-open-url',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['In Settings, Help tap "Guides"'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'useOpenUrl (features/browser/browser/use-open-url.ts) dismisses open sheets and navigates to /browser?url=<url> for http(s) links, used by Help, the learn cards and activity items; other schemes go to the system through Linking.',
  },
  {
    id: 'tab-bar',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Open a token screen', 'Tap the active Home tab'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'Bottom tabs "Home", "Activity" and "Browser" (features/navigation/tab-layout.tsx). Tapping the active tab scrolls its list to the top; on a nested route such as a token screen it dismisses back to Home (tab-button.tsx).',
  },
  {
    id: 'app-error-boundary',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Any screen that throws while rendering'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'The root ErrorBoundary (components/error/error-boundary.tsx) catches render errors below the root layout and shows "Something went wrong" with "Try again".',
  },
  {
    id: 'store-migrations',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Install a build with an older persisted store, then update the app'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [
      'apps/mobile/src/store/migrations/migrate-0-1-flatten-keychains.spec.ts',
      'apps/mobile/src/store/migrations/migrate-1-2-pad-fingerprints.spec.ts',
    ],
    description:
      'Redux persist migrations run before the splash screen hides: migrate-0-1 flattens keychains and migrate-1-2 pads wallet fingerprints.',
  },
  {
    id: 'haptics',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['In Settings, Display toggle "Haptics"'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'HapticsProvider (core/haptics-provider) plays tactile feedback on presses that ask for it, such as cells with haptics="soft"; the "Haptics" switch on the Display screen turns it off.',
  },
  {
    id: 'page-view-tracking',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Navigate between any two screens'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'usePageViewTracking in the root layout sends a screen event with the pathname and params to analytics on every route change, and the first launch is tracked once (trackFirstAppOpen).',
  },
] as const satisfies readonly MobileFeatureEntry[];
