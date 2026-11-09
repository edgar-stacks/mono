export const bridgeClientPath = '/bridge-client.js';

const styles = `
  body { font-family: system-ui, sans-serif; background: #f5f1ed; color: #12100f; margin: 0; }
  main { max-width: 480px; margin: 64px auto; padding: 32px; background: #fff; border-radius: 16px; }
  h1 { font-size: 22px; margin: 0 0 16px; }
  ul { padding-left: 20px; line-height: 1.6; word-break: break-all; }
  #code { font-family: ui-monospace, monospace; font-size: 20px; letter-spacing: 2px; }
  button { font-size: 16px; padding: 12px 20px; border: 0; border-radius: 8px; background: #12100f; color: #fff; cursor: pointer; }
`;

export function renderBridgePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Leather MCP</title>
    <style>${styles}</style>
  </head>
  <body>
    <main>
      <h1 id="title">Leather MCP</h1>
      <ul id="summary"></ul>
      <p id="code"></p>
      <p id="status">Loading request…</p>
      <button id="approve" type="button" hidden>Open in Leather</button>
    </main>
    <script type="module" src="${bridgeClientPath}"></script>
  </body>
</html>
`;
}
