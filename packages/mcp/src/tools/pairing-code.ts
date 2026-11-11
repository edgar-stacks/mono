import { randomInt } from 'node:crypto';

import { PAIRING_CODE_LENGTH } from '../constants';

const pairingCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createPairingCode() {
  return Array.from(
    { length: PAIRING_CODE_LENGTH },
    () => pairingCodeAlphabet[randomInt(pairingCodeAlphabet.length)]
  ).join('');
}
