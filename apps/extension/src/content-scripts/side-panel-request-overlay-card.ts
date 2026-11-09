import { SidePanelSelectors } from '@tests/selectors/side-panel.selectors';

import {
  type ShowSidePanelOverlayMessage,
  getSidePanelOverlayCopy,
} from '@shared/utils/side-panel-request-overlay';

const overlayHostId = 'leather-side-panel-request-overlay';
const overlayFontFamily = 'Leather Overlay Diatype';
const overlayFontStyleId = 'leather-side-panel-request-overlay-fonts';
const overlayIconPath = 'assets/icons/leather-icon-128.png';
const maxZIndex = '2147483647';

const overlayStyles = `
  :host { all: initial; }
  .card {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: ${maxZIndex};
    box-sizing: border-box;
    display: flex;
    gap: 12px;
    width: 340px;
    max-width: calc(100vw - 32px);
    padding: 16px;
    border-radius: 12px;
    background: #fff;
    color: #12100f;
    box-shadow: 0 12px 32px rgba(18, 16, 15, 0.18), 0 0 0 1px rgba(18, 16, 15, 0.08);
    font-family: '${overlayFontFamily}', system-ui, sans-serif;
    font-size: 14px;
    line-height: 20px;
  }
  .icon { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; }
  .body { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; min-width: 0; }
  .title { margin: 0; font-size: 15px; font-weight: 500; }
  .description { margin: 0; color: #5c5753; }
  .action {
    align-self: flex-start;
    margin-top: 8px;
    padding: 8px 16px;
    border: 0;
    border-radius: 6px;
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
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #5c5753;
    font: inherit;
    font-size: 18px;
    line-height: 24px;
    cursor: pointer;
  }
  .action:focus-visible, .dismiss:focus-visible { outline: 2px solid #12100f; outline-offset: 2px; }
`;

function injectOverlayFonts() {
  if (document.getElementById(overlayFontStyleId)) return;
  const style = document.createElement('style');
  style.id = overlayFontStyleId;
  style.textContent = [
    ['diatype-regular.woff2', 400],
    ['diatype-medium.woff2', 500],
  ]
    .map(
      ([file, weight]) => `@font-face {
        font-family: '${overlayFontFamily}';
        src: url('${chrome.runtime.getURL(`assets/fonts/diatype/${file}`)}') format('woff2');
        font-weight: ${weight};
        font-style: normal;
      }`
    )
    .join('\n');
  (document.head ?? document.documentElement).appendChild(style);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  testId?: string
) {
  const element = document.createElement(tagName);
  element.className = className;
  if (testId) element.dataset.testid = testId;
  return element;
}

let shownRequestId: string | null = null;
let shownVariant: ShowSidePanelOverlayMessage['payload']['variant'] | null = null;

export function hideSidePanelRequestOverlay() {
  shownRequestId = null;
  shownVariant = null;
  document.getElementById(overlayHostId)?.remove();
}

export function hideSidePanelRequestOverlayOnResponse(responseId: unknown) {
  if (shownVariant === 'review' && responseId === shownRequestId) hideSidePanelRequestOverlay();
}

interface ShowSidePanelRequestOverlayArgs {
  message: ShowSidePanelOverlayMessage;
  onOpenPanel(): void;
  onDismiss(): void;
}
export function showSidePanelRequestOverlay({
  message,
  onOpenPanel,
  onDismiss,
}: ShowSidePanelRequestOverlayArgs) {
  hideSidePanelRequestOverlay();
  injectOverlayFonts();
  const { requestId, category, variant } = message.payload;
  const copy = getSidePanelOverlayCopy(category, variant);

  const host = document.createElement('div');
  host.id = overlayHostId;
  const shadowRoot = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = overlayStyles;

  const card = createElement('section', 'card', SidePanelSelectors.RequestOverlay);
  card.setAttribute('role', variant === 'action-required' ? 'alertdialog' : 'status');
  card.setAttribute('aria-label', copy.title);

  const icon = createElement('img', 'icon');
  icon.src = chrome.runtime.getURL(overlayIconPath);
  icon.alt = '';

  const body = createElement('div', 'body');
  const title = createElement('p', 'title', SidePanelSelectors.RequestOverlayTitle);
  title.textContent = copy.title;
  const description = createElement('p', 'description');
  description.textContent = copy.description;
  body.append(title, description);

  if (copy.actionLabel) {
    const action = createElement('button', 'action', SidePanelSelectors.RequestOverlayOpenPanelBtn);
    action.type = 'button';
    action.textContent = copy.actionLabel;
    action.addEventListener('click', () => onOpenPanel());
    body.append(action);
  }

  const dismiss = createElement('button', 'dismiss', SidePanelSelectors.RequestOverlayDismissBtn);
  dismiss.type = 'button';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss request');
  dismiss.addEventListener('click', () => {
    hideSidePanelRequestOverlay();
    onDismiss();
  });

  card.append(icon, body, dismiss);
  shadowRoot.append(style, card);
  document.documentElement.appendChild(host);
  shownRequestId = requestId;
  shownVariant = variant;
}
