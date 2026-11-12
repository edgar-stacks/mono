import { type BrowserContext, type Page, chromium, expect } from '@playwright/test';
import { test as base } from '@tests/fixtures/fixtures';

import '@tests/leather-provider';

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const sidePanelPagePath = 'side-panel.html';
const actionPopupPath = 'action-popup.html';
const sidePanelContextType = 'SIDE_PANEL';
export const panelActionTimeoutMs = 3000;

export const panelHomeUrl = /side-panel\.html#\/$/;

type PanelUrl = string | RegExp;

function matchesPanelUrl(page: Page, url: PanelUrl) {
  return typeof url === 'string' ? page.url().includes(url) : url.test(page.url());
}

function describePanelUrl(url: PanelUrl) {
  return typeof url === 'string' ? url : url.source;
}

async function readDevToolsPort(userDataDir: string) {
  const activePort = await readFile(path.join(userDataDir, 'DevToolsActivePort'), 'utf8');
  const [port] = activePort.split('\n');
  return port;
}

export class SidePanelDemo {
  constructor(
    readonly context: BrowserContext,
    readonly devToolsPort: string
  ) {}

  private get serviceWorker() {
    const [serviceWorker] = this.context.serviceWorkers();
    if (!serviceWorker) throw new Error('Extension service worker is not running');
    return serviceWorker;
  }

  getActionPopup() {
    return this.serviceWorker.evaluate(() => chrome.action.getPopup({}));
  }

  async isOpenedOnActionClick() {
    const behavior = await this.serviceWorker.evaluate(() => chrome.sidePanel.getPanelBehavior());
    return behavior.openPanelOnActionClick ?? false;
  }

  async isPanelEnabled() {
    const options = await this.serviceWorker.evaluate(() => chrome.sidePanel.getOptions({}));
    return options.enabled ?? false;
  }

  async countOpenPanels() {
    const contextTypes = await this.serviceWorker.evaluate(async () => {
      const contexts = await chrome.runtime.getContexts({});
      return contexts.map(context => String(context.contextType));
    });
    return contextTypes.filter(contextType => contextType === sidePanelContextType).length;
  }

  async waitUntilPanelModeIsActive() {
    await expect.poll(() => this.getActionPopup()).toEqual('');
  }

  async waitUntilActionPopupIsRestored() {
    await expect.poll(() => this.getActionPopup()).toContain(actionPopupPath);
  }

  private async findPanelPage(url: PanelUrl) {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${this.devToolsPort}`);
    return browser
      .contexts()
      .flatMap(context => context.pages())
      .find(
        page =>
          !page.isClosed() && page.url().includes(sidePanelPagePath) && matchesPanelUrl(page, url)
      );
  }

  async getPanel(url: PanelUrl = sidePanelPagePath): Promise<Page> {
    let panel: Page | undefined;
    await expect
      .poll(async () => {
        panel = await this.findPanelPage(url);
        return Boolean(panel);
      })
      .toBe(true);
    if (!panel) throw new Error('Side panel did not open');
    return panel;
  }

  async actInPanel(url: PanelUrl, action: (panel: Page) => Promise<unknown>) {
    await expect(async () => {
      const panel = await this.findPanelPage(url);
      if (!panel) throw new Error(`Side panel is not showing ${describePanelUrl(url)}`);
      await action(panel);
    }).toPass();
  }
}

export async function addRequestButton(page: Page, method: string, params?: unknown) {
  const label = `Request ${method}`;
  await page.evaluate(
    ({ label, method, params }) => {
      const button = document.createElement('button');
      button.textContent = label;
      async function sendRequest() {
        try {
          const response = await window.LeatherProvider?.request(method, params);
          button.dataset.response = JSON.stringify(response);
        } catch (error) {
          button.dataset.response = JSON.stringify(error);
        }
      }
      button.addEventListener('click', () => void sendRequest());
      document.body.prepend(button);
    },
    { label, method, params }
  );
  return page.getByRole('button', { name: label, exact: true });
}

export async function sendRequestOnPageLoad(page: Page, method: string) {
  await page.addInitScript(method => {
    const pollIntervalMs = 50;
    const timer = setInterval(() => {
      const provider = window.LeatherProvider;
      if (!provider) return;
      clearInterval(timer);
      async function sendRequest() {
        const output = document.createElement('output');
        output.setAttribute('aria-label', 'Leather response');
        try {
          output.textContent = JSON.stringify(await provider?.request(method));
        } catch (error) {
          output.textContent = JSON.stringify(error);
        }
        document.body.append(output);
      }
      void sendRequest();
    }, pollIntervalMs);
  }, method);
  await page.goto('localhost:3000');
  return page.getByRole('status', { name: 'Leather response' });
}

export function getRequestOverlay(page: Page) {
  return page.getByRole('dialog');
}

export const test = base.extend<{ userDataDir: string; sidePanelDemo: SidePanelDemo }>({
  async userDataDir({ headless }, use) {
    const userDataDir = await mkdtemp(path.join(tmpdir(), `side-panel-demo-${String(headless)}-`));
    await use(userDataDir);
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 5 });
  },
  async context({ headless, userDataDir }, use) {
    const pathToExtension = path.join(process.cwd(), 'dist');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless,
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--remote-debugging-port=0',
        '--use-gl=egl',
      ],
    });
    await use(context);
    await context.close();
  },
  async sidePanelDemo({ context, userDataDir, extensionId }, use) {
    expect(extensionId).toBeTruthy();
    await use(new SidePanelDemo(context, await readDevToolsPort(userDataDir)));
  },
});
