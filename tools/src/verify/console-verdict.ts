import { type VerifyFinding } from './verify-contract.js';

export interface ConsoleEntry {
  readonly page: string;
  readonly type: string;
  readonly text: string;
  readonly location?: string;
}

export interface PageErrorEntry {
  readonly page: string;
  readonly message: string;
}

export interface ConsoleAllowRule {
  readonly pattern: RegExp | string;
  readonly reason: string;
}

export interface ConsoleVerdictInput {
  readonly consoleEntries: readonly ConsoleEntry[];
  readonly pageErrors: readonly PageErrorEntry[];
  readonly allowlist: readonly ConsoleAllowRule[];
  readonly allowConsoleErrors: boolean;
}

const consoleErrorType = 'error';

export function consoleLine(entry: ConsoleEntry): string {
  return entry.location ? `${entry.text} (${entry.location})` : entry.text;
}

export function allowRuleFor(
  text: string,
  allowlist: readonly ConsoleAllowRule[]
): ConsoleAllowRule | undefined {
  return allowlist.find(rule =>
    typeof rule.pattern === 'string' ? text.includes(rule.pattern) : rule.pattern.test(text)
  );
}

export function consoleFindings({
  consoleEntries,
  pageErrors,
  allowlist,
  allowConsoleErrors,
}: ConsoleVerdictInput): VerifyFinding[] {
  const findings: VerifyFinding[] = [];
  for (const error of pageErrors) {
    if (allowRuleFor(error.message, allowlist)) continue;
    findings.push({ kind: 'page-error', message: `${error.page}: ${error.message}` });
  }
  if (allowConsoleErrors) return findings;
  for (const entry of consoleEntries) {
    const line = consoleLine(entry);
    if (entry.type !== consoleErrorType || allowRuleFor(line, allowlist)) continue;
    findings.push({ kind: 'console-error', message: `${entry.page}: ${line}` });
  }
  return findings;
}
