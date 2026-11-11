# @leather.io/mcp

A local [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents such as Claude Desktop and Claude Code read a paired Leather account and propose transactions on mainnet.

The server never holds keys and never signs. Every transaction it proposes opens an approval page on `http://127.0.0.1:8437`, which hands the request to the Leather browser extension, where the user reviews and approves it.

## Run

```bash
pnpm --filter @leather.io/mcp build
node packages/mcp/dist/index.js
```

Add it to an MCP client, for example in Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "leather": {
      "command": "node",
      "args": ["/path/to/mono/packages/mcp/dist/index.js"]
    }
  }
}
```

Set `LEATHER_MCP_PORT` to serve the approval pages on another port. Changing the port means connecting the wallet again.

## Tools

- Connection: `get_wallet_status`, `connect_wallet`, `disconnect_wallet`
- Read-only: `get_balances`, `list_assets`, `get_activity`, `get_transaction_status`, `get_market_data`, `get_swap_quotes`, `resolve_name`, `get_defi_positions`
- Propose: `send_asset`, `call_contract`, `swap`
- Requests: `check_request`, `cancel_request`

## Pairing

`connect_wallet` returns a link and a 6-character pairing code. Opening the link asks Leather for the active account's addresses; once approved, they are saved to `~/.leather-mcp/pairing.json`. One account is paired at a time. `disconnect_wallet` forgets it, but Leather keeps the connected-app permission until it is removed in Leather.

Requests wait in memory for 10 minutes and are lost when the server restarts.
