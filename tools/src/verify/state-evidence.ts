import { z } from 'zod';

export const redactedValue = '[redacted]';

const encryptedSecretKeyField = 'encryptedSecretKey';
const softwareKeysSlice = 'softwareKeys';
const saltField = 'salt';

export interface StateEvidence {
  readonly slices: Record<string, unknown>;
  readonly missingSlices: readonly string[];
  readonly encryptionKeyPresent: boolean;
}

const recordSchema = z.record(z.string(), z.unknown());

function asRecord(value: unknown): Record<string, unknown> | undefined {
  const parsed = recordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function redactSecretKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretKeys);
  const record = asRecord(value);
  if (!record) return value;
  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    redacted[key] = key === encryptedSecretKeyField ? redactedValue : redactSecretKeys(child);
  }
  return redacted;
}

function redactSlice(name: string, value: unknown): unknown {
  const redacted = redactSecretKeys(value);
  const record = asRecord(redacted);
  if (name !== softwareKeysSlice || !record || !(saltField in record)) return redacted;
  return { ...record, [saltField]: redactedValue };
}

interface BuildStateEvidenceArgs {
  readonly persistedRoot: unknown;
  readonly slices: readonly string[];
  readonly encryptionKeyPresent: boolean;
}

export function buildStateEvidence({
  persistedRoot,
  slices,
  encryptionKeyPresent,
}: BuildStateEvidenceArgs): StateEvidence {
  const root = asRecord(persistedRoot) ?? {};
  const picked: Record<string, unknown> = {};
  const missingSlices: string[] = [];
  for (const slice of slices) {
    if (!(slice in root)) {
      missingSlices.push(slice);
      continue;
    }
    picked[slice] = redactSlice(slice, root[slice]);
  }
  return { slices: picked, missingSlices, encryptionKeyPresent };
}

export function resolveStateSlices(
  requested: string | undefined,
  whitelist: readonly string[],
  defaults: readonly string[]
): { readonly slices: readonly string[]; readonly unknown: readonly string[] } {
  if (requested === undefined) return { slices: [...defaults], unknown: [] };
  if (requested.trim() === 'all') return { slices: [...whitelist], unknown: [] };
  const slices = requested
    .split(',')
    .map(slice => slice.trim())
    .filter(slice => slice.length > 0);
  return { slices, unknown: slices.filter(slice => !whitelist.includes(slice)) };
}
