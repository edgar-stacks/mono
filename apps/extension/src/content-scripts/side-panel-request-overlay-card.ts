import {
  type SidePanelOverlayVariant,
  type SidePanelRequestCategory,
  createSidePanelOverlayActionMessage,
  getSidePanelOverlayCopy,
} from '@shared/utils/side-panel-request-overlay';

const overlayHostId = 'leather-side-panel-request-overlay';
const overlayFontStyleId = 'leather-side-panel-request-overlay-fonts';
const overlayFontFamily = 'Leather Diatype';
const overlayIconPath = 'assets/icons/leather-icon-128.png';
const overlayRegularFontPath = 'assets/fonts/diatype/diatype-regular.woff2';
const overlayMediumFontPath = 'assets/fonts/diatype/diatype-medium.woff2';

const overlayStyles = `
  :host { all: initial; }
  .card {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    box-sizing: border-box;
    display: flex;
    gap: 12px;
    width: 340px;
    max-width: calc(100vw - 32px);
    padding: 16px;
    border-radius: 12px;
    background: #fff;
    color: #12100f;
    box-shadow: 0 8px 32px rgba(18, 16, 15, 0.18);
    font-family: '${overlayFontFamily}', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    line-height: 20px;
  }
  .icon { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; }
  .content { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
  .title { margin: 0; font-weight: 500; font-size: 15px; }
  .description { margin: 0; color: #4f4c4a; }
  .action {
    align-self: flex-start;
    margin-top: 8px;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: #12100f;
    color: #fff;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .dismiss {
    align-self: flex-start;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    color: #4f4c4a;
    font-size: 18px;
    line-height: 24px;
    cursor: pointer;
  }
`;

function sendOverlayAction(type: 'open-panel' | 'dismiss') {
  void chrome.runtime.sendMessage(createSidePanelOverlayActionMessage(type));
}

function ensureOverlayFonts() {
  if (document.getElementById(overlayFontStyleId)) return;
  const style = document.createElement('style');
  style.id = overlayFontStyleId;
  style.textContent = `
    @font-face {
      font-family: '${overlayFontFamily}';
      font-weight: 400;
      src: url('${chrome.runtime.getURL(overlayRegularFontPath)}') format('woff2');
    }
    @font-face {
      font-family: '${overlayFontFamily}';
      font-weight: 500;
      src: url('${chrome.runtime.getURL(overlayMediumFontPath)}') format('woff2');
    }
  `;
  document.documentElement.appendChild(style);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  textContent?: string
) {
  const element = document.createElement(tagName);
  element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

export function hideSidePanelRequestOverlay() {
  document.getElementById(overlayHostId)?.remove();
}

interface ShowSidePanelRequestOverlayArgs {
  category: SidePanelRequestCategory;
  variant: SidePanelOverlayVariant;
}
export function showSidePanelRequestOverlay({
  category,
  variant,
}: ShowSidePanelRequestOverlayArgs) {
  hideSidePanelRequestOverlay();
  ensureOverlayFonts();

  const { title, description, actionLabel } = getSidePanelOverlayCopy({ category, variant });

  const host = document.createElement('div');
  host.id = overlayHostId;
  const shadowRoot = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = overlayStyles;

  const card = createElement('div', 'card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', title);

  const icon = createElement('img', 'icon');
  icon.src = chrome.runtime.getURL(overlayIconPath);
  icon.alt = '';

  const content = createElement('div', 'content');
  content.append(
    createElement('p', 'title', title),
    createElement('p', 'description', description)
  );

  if (actionLabel) {
    const action = createElement('button', 'action', actionLabel);
    action.type = 'button';
    action.addEventListener('click', () => sendOverlayAction('open-panel'));
    content.append(action);
  }

  const dismiss = createElement('button', 'dismiss', '×');
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.addEventListener('click', () => {
    hideSidePanelRequestOverlay();
    sendOverlayAction('dismiss');
  });

  card.append(icon, content, dismiss);
  shadowRoot.append(style, card);
  document.documentElement.appendChild(host);
}
