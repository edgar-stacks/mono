# Approval Ledger flow audit

How each journey behaves with a Ledger account in the `approval-flows` prototype. The rules live in
the pure journey reducer (`reduceJourneyRun`), and the reducer specs cover each one.

## Rules

- A software transaction submits as soon as it is approved, before confirmation.
- A Ledger transaction does not move forward before the device approves it.
- A device rejection returns to the review with a notice. Nothing is signed or submitted.
- An already-signed Ledger transaction broadcasts without asking the device again. This covers vault
  broadcasts after the threshold is met, and a retry after a failure before broadcast.
- Sharing a known Ledger account on connect needs no device signature.
- Stale or replayed callbacks are keyed by run, revision and request id and cannot advance or
  duplicate a journey.

## Journeys

| Journey                    | Device needed | Creates a transaction |
| -------------------------- | ------------- | --------------------- |
| Connect                    | No            | No                    |
| Message signing            | Yes           | No                    |
| Leather sends and swaps    | Yes           | Yes                   |
| App-built transactions     | Yes           | Only when broadcast   |
| PSBT signing               | Yes           | Only when broadcast   |
| Vault propose              | Yes           | No                    |
| Vault co-sign              | Yes           | No                    |
| Vault broadcast            | No            | Yes                   |
| Bitcoin staking enrollment | Yes           | Yes                   |
| Zest supply/withdraw       | Yes           | Yes                   |
| Zest borrow/repay          | Yes           | Yes                   |
| BNS registration           | Yes           | Yes                   |
| Bitflow swap               | Yes           | Yes                   |
| Stacking                   | Yes           | Yes                   |
| End stacking               | Yes           | Yes                   |
| Reward claims              | Yes           | Yes                   |
| Generic calls (three)      | Yes           | Yes                   |

## Out of scope

- Physical Ledger validation.
- Refactoring the production extension's Ledger artwork.
