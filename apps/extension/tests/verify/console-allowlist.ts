import type { ConsoleAllowlistEntry } from '@leather.io/tools/console-verdict';

export const consoleAllowlist: readonly ConsoleAllowlistEntry[] = [
  {
    pattern: /^Failed to load resource: net::ERR_FAILED$/,
    reason:
      'mockUnhandledRequests aborts every unmocked request; network.json lists them as fallback',
  },
  {
    pattern: /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/,
    url: /^https:\/\/staging\.api\.leather\.io\/v1\/tokens\/sip10s\//,
    reason: 'mockLeatherApiRequests answers 404 for the SIP-10 tokens it has no fixture for',
  },
  {
    pattern: /^Error: <svg> attribute height: Expected length, "auto"\.$/,
    reason: 'an icon renders height="auto" on every screen; not caused by the screen under test',
  },
  {
    pattern: /^Failed to load resource: net::ERR_CONNECTION_REFUSED$/,
    url: /^http:\/\/localhost:3999\//,
    reason:
      'the network list checks the sBTC Devenv node on localhost:3999, which a run does not start',
  },
];
