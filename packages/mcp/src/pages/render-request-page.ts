import type { PendingRequest } from '../requests/pending-request-store';

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => htmlEscapes[character] ?? character);
}

const pageStyles = `
  body { font-family: system-ui, sans-serif; background: #f7f5f3; color: #12100f; margin: 0; }
  main { max-width: 480px; margin: 48px auto; padding: 24px; background: #fff; border-radius: 16px; }
  h1 { font-size: 20px; margin: 0 0 16px; }
  ul { padding-left: 20px; line-height: 1.6; word-break: break-all; }
  .code { font-size: 28px; letter-spacing: 6px; font-weight: 600; margin: 8px 0 16px; }
  .muted { color: #6b6765; font-size: 14px; }
  button { width: 100%; padding: 14px; font-size: 16px; border: 0; border-radius: 10px;
    background: #12100f; color: #fff; cursor: pointer; }
  button:disabled { opacity: 0.4; cursor: default; }
  #status { margin-top: 16px; min-height: 24px; }
  #status[data-status='success'] { color: #2d7d46; }
  #status[data-status='error'] { color: #b3261e; }
`;

function renderPage(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Leather MCP</title>
    <style>${pageStyles}</style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;
}

export function renderRequestPage(request: PendingRequest) {
  const summary = request.summary.map(line => `<li>${escapeHtml(line)}</li>`).join('');
  const pairingCode = request.pairingCode
    ? `<p class="muted">Check that your agent shows the same pairing code:</p>
       <p class="code">${escapeHtml(request.pairingCode)}</p>`
    : '';
  const expiresAt = new Date(request.expiresAt).toLocaleTimeString();

  return renderPage(
    request.title,
    `<h1>${escapeHtml(request.title)}</h1>
     ${pairingCode}
     <ul>${summary}</ul>
     <p class="muted">Nothing happens until you approve it in Leather. This link expires at ${escapeHtml(expiresAt)}.</p>
     <button id="approve" type="button" disabled>Review in Leather</button>
     <p id="status" role="status">Loading…</p>
     <script src="/bridge.js" data-request-id="${escapeHtml(request.id)}"></script>`
  );
}

export function renderNotFoundPage() {
  return renderPage(
    'Request not found',
    `<h1>Request not found</h1>
     <p class="muted">This request does not exist or the server restarted. Ask your agent for a new link.</p>`
  );
}
