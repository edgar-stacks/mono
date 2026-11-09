# Approval Ledger design

Ledger approvals in the `approval-flows` playground area use a device sheet that rises over the
request, so the reviewer keeps the request in view while the device works.

## Artwork

The sheet uses the shared Ledger illustrations from `@leather.io/ui`: `SignLedgerTransaction`,
`ConnectLedgerSuccess`, `LedgerTxRejected`, `LedgerIlluDisconnected`, `ConnectLedgerErr`, and the
`plugged-in-cable-bright.lottie.json` cable animation. The production extension keeps its own copies
for now.

## Sheet states

| State        | Illustration            | Copy                                               |
| ------------ | ----------------------- | -------------------------------------------------- |
| connect      | Cable animation         | Plug in, unlock and open the Bitcoin or Stacks app |
| review       | Sign Ledger transaction | Check the amount, recipient and fee on the device  |
| rejected     | Transaction rejected    | Nothing was signed; review and try again           |
| disconnected | Disconnected            | Reconnect to continue; nothing was signed          |
| error        | Connect error           | Open the Bitcoin or Stacks app                     |
| success      | Connect success         | Leather received the signature                     |

Every sheet says it is a simulated device. The prototype offers "Ledger is connected", "Approve on
device" and "Reject on device" in place of a real device.

## Motion

The cable animation loops while Leather waits for the device. With `prefers-reduced-motion`, and in
any noninteractive preview, it stays on the connected frame.

## Identity

The account section names a Ledger account as "Ledger". In a vault request the vault's funds and the
personal Ledger signer are separate rows, so it is clear whose funds move and whose device signs.
