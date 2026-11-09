import { HIRO_EXPLORER_URL, MEMPOOL_BASE_URL } from '@leather.io/constants';

import { NETWORK } from '../constants';

export function toStacksTxid(txid: string) {
  return txid.startsWith('0x') ? txid : `0x${txid}`;
}

export function getExplorerUrl(chain: 'bitcoin' | 'stacks', txid: string) {
  if (chain === 'bitcoin') return `${MEMPOOL_BASE_URL}/tx/${txid}`;
  return `${HIRO_EXPLORER_URL}/txid/${toStacksTxid(txid)}?chain=${NETWORK}`;
}
