import { minutesInMs } from '@leather.io/utils';

export const MCP_SERVER_NAME = 'leather-mcp';
export const MCP_SERVER_VERSION = '0.1.0';

export const LISTEN_HOST = '127.0.0.1';
export const DEFAULT_PORT = 8437;
export const PORT_ENV_VAR = 'LEATHER_MCP_PORT';

export const NETWORK = 'mainnet';

export const PAIRING_DIR_NAME = '.leather-mcp';
export const PAIRING_FILE_NAME = 'pairing.json';

export const REQUEST_TTL_MS = minutesInMs(10);
export const SWAP_QUOTE_TTL_MS = minutesInMs(5);

export const MIN_WAIT_SECONDS = 1;
export const MAX_WAIT_SECONDS = 50;

export const DEFAULT_SLIPPAGE_PERCENT = 3;
export const MAX_SLIPPAGE_PERCENT = 50;

export const PAIRING_CODE_LENGTH = 6;
export const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DEFAULT_ACTIVITY_LIMIT = 20;
export const MAX_ACTIVITY_LIMIT = 100;

export const MAX_REQUEST_BODY_BYTES = 1_000_000;
