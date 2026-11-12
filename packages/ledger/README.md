# @leather.io/ledger

`@leather.io/ledger` holds Leather's Ledger device code behind a vendor-neutral hardware wallet contract.

- `contract/` defines `HardwareWallet`, `HardwareWalletConnector`, `HardwareWalletError` and `withHardwareWallet`, with no Ledger SDK imports.
- `adapter/` implements the contract for Ledger with `createLedgerConnector`, which takes the transport factory from the consumer.
- `@leather.io/ledger/test-utils` ships fake hardware wallets and Ledger SDK doubles for tests.
