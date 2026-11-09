import { colorThemes } from '@leather.io/tokens';

import { BRIDGE_SCRIPT_FILE_NAME } from '../constants';

const palette = colorThemes.base;

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

interface ApprovalPageProps {
  requestId: string;
  title: string;
  summary: string;
  pairingCode?: string;
}

export function renderApprovalPage({ requestId, title, summary, pairingCode }: ApprovalPageProps) {
  const pairingCodeBlock = pairingCode
    ? `<p class="label">Pairing code</p><p class="code">${escapeHtml(pairingCode)}</p>
       <p class="hint">Check that your agent shows the same code before you approve.</p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Leather MCP</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: ${palette['ink.background-secondary']}; color: ${palette['ink.text-primary']}; }
      main { max-width: 480px; margin: 64px auto; padding: 32px; background: ${palette['ink.background-primary']}; border: 1px solid ${palette['ink.border-default']}; border-radius: 16px; }
      h1 { font-size: 22px; margin: 0 0 16px; }
      .summary { white-space: pre-wrap; line-height: 1.5; }
      .label { margin: 24px 0 4px; color: ${palette['ink.text-subdued']}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; }
      .code { margin: 0; font: 600 28px ui-monospace, monospace; letter-spacing: 0.2em; }
      .hint, .status { color: ${palette['ink.text-secondary']}; line-height: 1.5; }
      button { margin-top: 24px; width: 100%; padding: 14px; border: 0; border-radius: 8px; font-size: 16px; cursor: pointer; background: ${palette['ink.action-primary-default']}; color: ${palette['ink.background-primary']}; }
      button:disabled { cursor: default; opacity: 0.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p class="summary">${escapeHtml(summary)}</p>
      ${pairingCodeBlock}
      <button id="approve" type="button" disabled>Review in Leather</button>
      <p id="status" class="status" role="status">Loading request…</p>
      <p class="hint">Leather MCP never holds your keys. Leather shows the full details and asks you to confirm.</p>
    </main>
    <script src="/${BRIDGE_SCRIPT_FILE_NAME}" data-request-id="${escapeHtml(requestId)}"></script>
  </body>
</html>`;
}

export function renderMessagePage(title: string, message: string) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>${escapeHtml(title)} · Leather MCP</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 64px auto;">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </body>
</html>`;
}
