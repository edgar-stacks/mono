import type { BrowserContext, ConsoleMessage, Request, Response, WebError } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ConsoleEntry, PageErrorEntry } from '@leather.io/tools/console-verdict';
import type {
  NetworkRequestRecord,
  NetworkRouteTag,
} from '@leather.io/tools/network-classification';

const webProtocols = /^https?:/;

interface MutableRequestRecord {
  url: string;
  method: string;
  resourceType: string;
  tag?: NetworkRouteTag;
  status?: number;
  failure?: string;
}

function consolePageLabel(message: ConsoleMessage) {
  return message.page()?.url() ?? message.worker()?.url() ?? 'unknown';
}

function locationLabel(message: ConsoleMessage) {
  const { url, lineNumber } = message.location();
  return url ? `${url}:${lineNumber}` : undefined;
}

export class VerifyEvidence {
  readonly pageConsole: ConsoleEntry[] = [];
  readonly workerConsole: ConsoleEntry[] = [];
  readonly pageErrors: PageErrorEntry[] = [];
  private readonly requests = new Map<Request, MutableRequestRecord>();

  constructor(private readonly context: BrowserContext) {}

  attach() {
    this.context.on('console', message => this.onConsole(message));
    this.context.on('weberror', error => this.onWebError(error));
    this.context.on('request', request => this.recordFor(request));
    this.context.on('response', response => this.onResponse(response));
    this.context.on('requestfailed', request => {
      this.recordFor(request).failure = request.failure()?.errorText ?? 'failed';
    });
  }

  async trackRequests(tag: NetworkRouteTag) {
    await this.context.route(/.*/, route => {
      const request = route.request();
      if (webProtocols.test(request.url())) this.recordFor(request).tag = tag;
      return tag === 'real' ? route.continue() : route.fallback();
    });
  }

  networkRecords(): NetworkRequestRecord[] {
    return [...this.requests.values()].map(record => ({ ...record }));
  }

  private recordFor(request: Request) {
    const existing = this.requests.get(request);
    if (existing) return existing;
    const record: MutableRequestRecord = {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    };
    this.requests.set(request, record);
    return record;
  }

  private onResponse(response: Response) {
    this.recordFor(response.request()).status = response.status();
  }

  private onConsole(message: ConsoleMessage) {
    const entry = {
      page: consolePageLabel(message),
      type: message.type(),
      text: message.text(),
      location: locationLabel(message),
    };
    if (message.worker() && !message.page()) {
      this.workerConsole.push(entry);
      return;
    }
    this.pageConsole.push(entry);
  }

  private onWebError(error: WebError) {
    const thrown = error.error();
    this.pageErrors.push({
      page: error.page()?.url() ?? 'unknown',
      message: thrown.stack ?? `${thrown.name}: ${thrown.message}`,
    });
  }
}

export function writeArtifact(outDir: string, name: string, content: unknown) {
  mkdirSync(outDir, { recursive: true });
  const text = typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`;
  writeFileSync(path.join(outDir, name), text);
  return name;
}
