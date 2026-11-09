import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { PAIRING_DIRECTORY_NAME, PAIRING_FILE_NAME } from '../constants';
import { type WalletPairing, walletPairingSchema } from './pairing';

const pairingFileMode = 0o600;

function getDefaultPairingFilePath() {
  return join(homedir(), PAIRING_DIRECTORY_NAME, PAIRING_FILE_NAME);
}

export class PairingStore {
  private pairing: WalletPairing | undefined;

  constructor(private readonly filePath = getDefaultPairingFilePath()) {}

  async load() {
    try {
      const contents = await readFile(this.filePath, 'utf-8');
      const parsed = walletPairingSchema.safeParse(JSON.parse(contents));
      this.pairing = parsed.success ? parsed.data : undefined;
    } catch {
      this.pairing = undefined;
    }
    return this.pairing;
  }

  get() {
    return this.pairing;
  }

  async save(pairing: WalletPairing) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(pairing, null, 2), { mode: pairingFileMode });
    this.pairing = pairing;
  }

  async clear() {
    await rm(this.filePath, { force: true });
    this.pairing = undefined;
  }
}
