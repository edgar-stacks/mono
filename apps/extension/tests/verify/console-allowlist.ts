import type { ConsoleAllowRule } from '@leather.io/tools/console-verdict';

export const consoleAllowlist: readonly ConsoleAllowRule[] = [
  {
    pattern: /^Failed to load resource: net::ERR_FAILED$/,
    reason: 'mockUnhandledRequests aborts every request no mock answers',
  },
  {
    pattern: /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/,
    location: /\/v1\/tokens\/sip10s\//,
    reason: 'mockLeatherApiRequests answers SIP-10 metadata lookups with 404',
  },
];
