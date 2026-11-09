import {
  type SidePanelOverlayShowMessage,
  createSidePanelOverlayDismissMessage,
  createSidePanelOverlayOpenPanelMessage,
  getSidePanelOverlayCopy,
} from '@shared/utils/side-panel-request-overlay';

const overlayHostId = 'leather-side-panel-request-overlay';
const overlayIconPath = 'assets/icons/leather-icon-128.png';
const overlayFontPath = 'assets/fonts/diatype/diatype-regular.woff2';
const overlayMediumFontPath = 'assets/fonts/diatype/diatype-medium.woff2';

function getOverlayStyles() {
  return `
    @font-face {
      font-family: 'Leather Diatype';
      src: url('${chrome.runtime.getURL(overlayFontPath)}') format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Leather Diatype';
      src: url('${chrome.runtime.getURL(overlayMediumFontPath)}') format('woff2');
      font-weight: 500;
    }
    :host {
      all: initial;
    }
    .card {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      box-sizing: border-box;
      width: 320px;
      max-width: calc(100vw - 32px);
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-radius: 12px;
      background: #fff;
      color: #12100f;
      box-shadow: 0 8px 32px rgba(18, 16, 15, 0.24);
      font-family: 'Leather Diatype', system-ui, sans-serif;
      font-size: 14px;
      line-height: 20px;
    }
    .icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-grow: 1;
    }
    .title {
      margin: 0;
      font-weight: 500;
      font-size: 15px;
    }
    .description {
      margin: 0;
      color: #605753;
    }
    .action {
      margin-top: 8px;
      align-self: flex-start;
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
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: #605753;
      font: inherit;
      font-size: 18px;
      line-height: 24px;
      cursor: pointer;
    }
  `;
}

function sendToBackground(message: unknown) {
  void chrome.runtime.sendMessage(message);
}

export function hideSidePanelRequestOverlay() {
  document.getElementById(overlayHostId)?.remove();
}

export function showSidePanelRequestOverlay({ category, variant }: SidePanelOverlayShowMessage) {
  hideSidePanelRequestOverlay();
  const copy = getSidePanelOverlayCopy(category, variant);

  const host = document.createElement('div');
  host.id = overlayHostId;
  const shadowRoot = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = getOverlayStyles();

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', copy.title);
  card.dataset.variant = variant;

  const icon = document.createElement('img');
  icon.className = 'icon';
  icon.src = chrome.runtime.getURL(overlayIconPath);
  icon.alt = '';

  const body = document.createElement('div');
  body.className = 'body';

  const title = document.createElement('p');
  title.className = 'title';
  title.textContent = copy.title;

  const description = document.createElement('p');
  description.className = 'description';
  description.textContent = copy.description;

  body.append(title, description);

  if (copy.callToAction) {
    const action = document.createElement('button');
    action.className = 'action';
    action.type = 'button';
    action.textContent = copy.callToAction;
    action.addEventListener('click', () =>
      sendToBackground(createSidePanelOverlayOpenPanelMessage())
    );
    body.append(action);
  }

  const dismiss = document.createElement('button');
  dismiss.className = 'dismiss';
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.textContent = '×';
  dismiss.addEventListener('click', () => {
    hideSidePanelRequestOverlay();
    sendToBackground(createSidePanelOverlayDismissMessage());
  });

  card.append(icon, body, dismiss);
  shadowRoot.append(style, card);
  document.documentElement.append(host);
}
