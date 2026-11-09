# Verify a screen

`pnpm lt verify extension` opens one feature-map entry of the extension under its preconditions,
waits for its ready selector and leaves evidence an agent or a reviewer can read. It is a local
tool; no CI job runs it.

## Prerequisites

- A `build:test` dist: `pnpm --filter @leather.io/extension build:test`, or pass `--build`.
- The Chromium browser Playwright uses (`pnpm --filter @leather.io/extension exec playwright install chromium`).
- `LAUNCH_DARKLY_KEY` in `apps/extension/.env` when a run overrides flags.
- No mnemonic: every session is seeded from the test wallet's encrypted state.

## Usage

```bash
pnpm lt verify extension --feature receive-dialog
pnpm lt verify extension --route /token/BTC
pnpm lt verify extension --feature rpc-get-addresses --rpc catalog:getAddresses
```

The entry supplies the route (or `startRoute` plus its `open` actions), the session, `accountType`,
`network`, flags, mocks and `selectors.ready`. Options override it:

| Option                                           | Meaning                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `--signed-in`, `--signed-out`, `--locked`        | Session                                                                                      |
| `--account-type software\|ledger\|mixed\|policy` | Wallet to seed; anything but software is mainnet-only, and a locked Ledger wallet is refused |
| `--network <id>`                                 | A `WalletDefaultNetworkConfigurationIds` value                                               |
| `--flags a=true,b=false`                         | LaunchDarkly overrides on top of the entry's flags                                           |
| `--mocks default\|none\|<list>`                  | Entry mocks, no mocks (real LaunchDarkly, `--flags` refused) or registered mocks             |
| `--ready <testId>`                               | Ready selector                                                                               |
| `--rpc <method>\|catalog:<id>`                   | Send an RPC request from the test app on port 3000 and capture the approver                  |
| `--params <file>`                                | JSON params for the request instead of the catalog's                                         |
| `--state <slices>\|all`                          | Persisted slices for `state.json` (default `active,networks,wallets`)                        |
| `--[no-]connect-test-app`                        | Seed the test app as connected (default on for rpc runs)                                     |
| `--allow-console-errors`                         | Do not fail on page or console errors                                                        |
| `--out <dir>`                                    | Evidence directory                                                                           |
| `--timeout <ms>`                                 | Ready timeout (default 30000)                                                                |
| `--build`                                        | Run `build:test` first                                                                       |

Entries a run cannot open are usage errors: `behavior` anchors, entries with no `selectors.ready`,
`selectors` entries with no `open`, `deepLinkable: false` entries with no `open` and rpc entries
with no method. The generated feature map prints the reason in place of the command. Catalog rpc
runs refuse `--locked`.

## Exit codes

| Code | Verdict         | Meaning                                                                                                                                                                                                       |
| ---- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `verified`      | The ready selector appeared and nothing failed                                                                                                                                                                |
| 1    | `usage`         | The options or the entry cannot make a run                                                                                                                                                                    |
| 2    | `ready-not-met` | The ready selector never appeared                                                                                                                                                                             |
| 3    | `errors`        | An rpc error before an approver, a page or console error not in `tests/verify/console-allowlist.ts`, a background error, a `real` request under mocks, or a mock `tests/verify/mock-registry.ts` cannot apply |
| 4    | `env`           | No dist, not a `build:test` dist, a failed `--build`, or Playwright died                                                                                                                                      |

## Artifacts

Each run writes to `apps/extension/verify-results/<feature-or-route>-<UTC YYYYMMDD-HHMMSS>/`, which
is gitignored.

| File                     | Content                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screenshot.png`         | The screen, or the approver for an rpc run                                                                                                               |
| `a11y.md`                | `ariaSnapshot()` of the body                                                                                                                             |
| `console.json`           | Console messages and page errors from setup and from the screen, and the screen's unexpected errors                                                      |
| `network.json`           | Every request, classified as extension, local, mocked, fallback, real, failed or other                                                                   |
| `background-errors.json` | `logger.error`, `console.error`, uncaught errors and unhandled rejections of the background, from `chrome.storage.session` key `verify:backgroundErrors` |
| `state.json`             | The requested persisted slices, with `softwareKeys.salt` and every `encryptedSecretKey` replaced, and `encryptionKeyPresent`                             |
| `rpc-request.json`       | Method, catalog id, params, approver URL and outcome of an rpc run                                                                                       |
| `summary.json`           | Verdict, exit code, reasons, request counts and the resolved run                                                                                         |

## How it fits together

The CLI resolves the run from the entry (`resolve.ts`), checks the dist (`preflight.ts`) and passes
the run to `apps/extension/tests/verify/verify-screen.spec.ts` through `VERIFY_*` variables
(`verify-contract.ts`). Playwright only collects that spec when `VERIFY_RUN=1`. The spec reuses
the fixtures, page objects and mocks, classifies console messages (`console-verdict.ts`) and
requests (`network-classification.ts`), redacts state (`state-evidence.ts`) and writes the
summary the CLI turns into an exit code. `pnpm lt feature-map check` rejects mocks the registry
does not know, mock pairs that route the same requests, and `open` actions that are not
zero-argument instance methods of a fixture page object.
