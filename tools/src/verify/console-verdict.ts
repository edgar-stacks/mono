export const consoleEntrySources = ['console', 'pageerror'] as const;
export type ConsoleEntrySource = (typeof consoleEntrySources)[number];

export interface ConsoleEntry {
  readonly source: ConsoleEntrySource;
  readonly type: string;
  readonly text: string;
  readonly url: string;
  readonly location?: string;
}

export interface ConsoleAllowRule {
  readonly pattern: RegExp;
  readonly location?: RegExp;
  readonly reason: string;
}

const errorType = 'error';

function isError(entry: ConsoleEntry): boolean {
  return entry.source === 'pageerror' || entry.type === errorType;
}

export function isAllowedConsoleEntry(
  entry: ConsoleEntry,
  allowlist: readonly ConsoleAllowRule[]
): boolean {
  return allowlist.some(
    rule =>
      rule.pattern.test(entry.text) &&
      (rule.location === undefined ||
        (entry.location !== undefined && rule.location.test(entry.location)))
  );
}

export function unexpectedConsoleErrors(
  entries: readonly ConsoleEntry[],
  allowlist: readonly ConsoleAllowRule[]
): ConsoleEntry[] {
  return entries.filter(entry => isError(entry) && !isAllowedConsoleEntry(entry, allowlist));
}
