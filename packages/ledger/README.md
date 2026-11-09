# @leather.io/ledger

`@leather.io/ledger` holds Leather's Ledger device code behind a vendor-neutral hardware wallet contract.

- `contract/` defines the `HardwareWallet`, `HardwareWalletConnector` and `HardwareWalletSession` contract, its errors and interactions. It imports nothing from the rest of the package and no Ledger SDK, so another vendor can implement it.
- `adapter/` implements the contract for Ledger with `createLedgerConnector`.
- `dmk/`, `bitcoin/` and `stacks/` hold the Ledger Device Management Kit, Bitcoin signer kit and Stacks app helpers the adapter is built on.

The transport is injected: the consumer passes a Device Management Kit `transportFactory` and its `transportIdentifier`, such as WebHID in the browser extension.

Test helpers ship from `@leather.io/ledger/test-utils`.
