import { HIRO_EXPLORER_URL, MEMPOOL_BASE_URL } from '@leather.io/constants';
import type { CryptoAssetChain } from '@leather.io/models';

import { MCP_NETWORK } from '../constants';

const stacksTxidPrefix = '0x';

export function normalizeStacksTxid(txid: string) {
  return txid.startsWith(stacksTxidPrefix) ? txid : `${stacksTxidPrefix}${txid}`;
}

export function getExplorerUrl(chain: CryptoAssetChain, txid: string) {
  if (chain === 'bitcoin') return `${MEMPOOL_BASE_URL}/tx/${txid}`;
  return `${HIRO_EXPLORER_URL}/txid/${normalizeStacksTxid(txid)}?chain=${MCP_NETWORK}`;
}
