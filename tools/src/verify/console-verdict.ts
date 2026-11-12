export interface ConsoleAllowlistEntry {
  readonly pattern: RegExp;
  readonly url?: RegExp;
  readonly reason: string;
}

export const capturedMessageSources = ['console', 'pageerror'] as const;

export interface CapturedConsoleMessage {
  readonly source: (typeof capturedMessageSources)[number];
  readonly type: string;
  readonly text: string;
  readonly url?: string;
}

interface ConsoleVerdictOptions {
  readonly allowConsoleErrors: boolean;
}

interface ConsoleVerdict {
  readonly blocking: readonly CapturedConsoleMessage[];
  readonly allowlisted: readonly (CapturedConsoleMessage & { readonly reason: string })[];
  readonly tolerated: readonly CapturedConsoleMessage[];
}

const errorType = 'error';

function isError(message: CapturedConsoleMessage): boolean {
  return message.source === 'pageerror' || message.type === errorType;
}

export function consoleVerdict(
  messages: readonly CapturedConsoleMessage[],
  allowlist: readonly ConsoleAllowlistEntry[],
  { allowConsoleErrors }: ConsoleVerdictOptions
): ConsoleVerdict {
  const blocking: CapturedConsoleMessage[] = [];
  const allowlisted: (CapturedConsoleMessage & { reason: string })[] = [];
  const tolerated: CapturedConsoleMessage[] = [];
  for (const message of messages.filter(isError)) {
    const entry = allowlist.find(
      item =>
        item.pattern.test(message.text) &&
        (!item.url || (message.url !== undefined && item.url.test(message.url)))
    );
    if (entry) {
      allowlisted.push({ ...message, reason: entry.reason });
      continue;
    }
    if (allowConsoleErrors && message.source === 'console') {
      tolerated.push(message);
      continue;
    }
    blocking.push(message);
  }
  return { blocking, allowlisted, tolerated };
}

const maxReasonTextLength = 300;

export function consoleErrorReasons(verdict: ConsoleVerdict): string[] {
  return verdict.blocking.map(message => {
    const text =
      message.text.length > maxReasonTextLength
        ? `${message.text.slice(0, maxReasonTextLength)}…`
        : message.text;
    const kind = message.source === 'pageerror' ? 'page error' : 'console error';
    return `${kind}${message.url ? ` on ${message.url}` : ''}: ${text}`;
  });
}
