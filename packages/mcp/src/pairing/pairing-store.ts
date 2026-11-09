import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PAIRING_FILE_NAME } from '../constants';
import { type Pairing, pairingSchema } from './pairing';

const privateDirMode = 0o700;
const privateFileMode = 0o600;

export class PairingStore {
  private pairing: Pairing | null = null;

  constructor(private readonly dir: string) {}

  get current() {
    return this.pairing;
  }

  private get filePath() {
    return join(this.dir, PAIRING_FILE_NAME);
  }

  async load() {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      const parsed = pairingSchema.safeParse(JSON.parse(content));
      this.pairing = parsed.success ? parsed.data : null;
    } catch {
      this.pairing = null;
    }
    return this.pairing;
  }

  async save(pairing: Pairing) {
    await mkdir(this.dir, { recursive: true, mode: privateDirMode });
    await writeFile(this.filePath, JSON.stringify(pairing, null, 2), { mode: privateFileMode });
    this.pairing = pairing;
  }

  async clear() {
    await rm(this.filePath, { force: true });
    this.pairing = null;
  }
}
