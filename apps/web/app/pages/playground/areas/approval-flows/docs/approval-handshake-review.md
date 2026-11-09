# Approval Handshake review

The Handshake direction is the one under review in the `approval-flows` playground area. The other
directions (Baseline, Activity, Breakdown, Balance, Receipt, Tactile, Phantom) stay registered as
references and are hidden by default: they mostly differ in presentation around the same structure.

Everything in the area is an illustrative fixture. Nothing calls an RPC method, builds a live
payload or talks to a device, and the playground gate keeps the area out of production.

## What a reviewer should be able to answer

For every approval screen, without opening details:

1. **Who asks?** The requester and the wallet meet in the header. The origin sits under the marks and
   unverified origins say so.
2. **Which account or vault signs?** The account section names the account and its kind (software,
   Ledger, vault). Vault requests show the vault's funds and the personal signer separately.
3. **What moves?** Estimated balance changes list what you send and receive, with fiat. A request
   without known movements says "No estimated balance change" instead of inventing one.
4. **What does it cost?** The fee row shows the amount, fiat and who set it.
5. **What is enforced?** Post-conditions and minimums appear as enforced limits. A Stacks spend
   without any limit gets a warning.
6. **What happens after signing?** Sign-only requests return to the app and create no transaction.
   Broadcast requests show as pending in Activity until they confirm or fail.

The viewer (`?view=viewer&screen=<id>`) lists these checks next to every screen.

## Structure

- Header: requester mark, connecting line, Leather mark, origin, title, one-line consequence.
- Notices: device rejection, request notices, the missing-limits warning.
- Account, then permissions (connect), message (signing), estimated balance change, enforced limits,
  fee, signers (vaults), details.
- Footer: Cancel and the primary action.

## Primary action

- Clicks before a minimum review time are ignored.
- A changed request needs fresh review time.
- A request confirms once; repeated clicks do nothing.
- Hold-to-approve (Tactile) fires once, only after a full hold, by pointer or keyboard.

## States after approval

Signing, broadcast, pending, confirmation and failure stay distinct:

| State                   | Activity       | Portfolio         |
| ----------------------- | -------------- | ----------------- |
| Signed (sign-only)      | Nothing        | Unchanged         |
| Pending                 | Pending row    | Unchanged         |
| Confirmed               | Summarised row | Movements and fee |
| Failed before broadcast | Nothing        | Unchanged, no fee |
| Failed on-chain         | Failed row     | Fee only          |

A failed submitted call keeps its fee and cannot continue as success.

## Activity

Confirmed contract calls that Leather cannot map keep their contract and function, and summarise the
account's net balance change in the trailing slot: received above spent, fiat for a single asset, a
count for three or more assets. Pending and failed rows keep today's presentation.
