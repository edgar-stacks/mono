import { randomInt } from 'node:crypto';

import { PAIRING_CODE_ALPHABET, PAIRING_CODE_LENGTH } from '../constants';

export function generatePairingCode() {
  return Array.from(
    { length: PAIRING_CODE_LENGTH },
    () => PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)]
  ).join('');
}
