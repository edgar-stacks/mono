import { z } from 'zod';

export const defaultStateSlices = ['active', 'networks', 'wallets'] as const;

const allSlices = 'all';
const redacted = '[redacted]';
const encryptedSecretKeyField = 'encryptedSecretKey';
const softwareKeysSlice = 'softwareKeys';
const saltField = 'salt';
const encryptionKeyField = 'encryptionKey';

type StateSlicesResult =
  | { readonly ok: true; readonly slices: readonly string[] }
  | { readonly ok: false; readonly error: string };

export function parseStateSlices(
  value: string | undefined,
  whitelist: readonly string[]
): StateSlicesResult {
  if (value === undefined) return { ok: true, slices: [...defaultStateSlices] };
  if (value.trim() === allSlices) return { ok: true, slices: [...whitelist] };
  const slices = [
    ...new Set(
      value
        .split(',')
        .map(slice => slice.trim())
        .filter(slice => slice.length > 0)
    ),
  ];
  if (slices.length === 0) {
    return { ok: false, error: `--state needs a comma-separated list of slices or '${allSlices}'` };
  }
  const unknown = slices.filter(slice => !whitelist.includes(slice));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `--state: ${unknown.join(', ')} ${unknown.length === 1 ? 'is not a persisted slice' : 'are not persisted slices'}. Use slices of persistWhitelist: ${whitelist.join(', ')}, or '${allSlices}'.`,
    };
  }
  return { ok: true, slices };
}

const recordSchema = z.record(z.string(), z.unknown());

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return undefined;
  const parsed = recordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      key === encryptedSecretKeyField ? redacted : redactSecrets(item),
    ])
  );
}

function redactSlice(name: string, value: unknown): unknown {
  const clean = redactSecrets(value);
  const record = asRecord(clean);
  if (name !== softwareKeysSlice || !record || !(saltField in record)) return clean;
  return { ...record, [saltField]: redacted };
}

interface StateEvidence {
  readonly slices: Readonly<Record<string, unknown>>;
  readonly missingSlices: readonly string[];
  readonly encryptionKeyPresent: boolean;
}

export function buildStateEvidence(
  persisted: unknown,
  session: unknown,
  slices: readonly string[]
): StateEvidence {
  const root = asRecord(persisted) ?? {};
  const picked: Record<string, unknown> = {};
  const missingSlices: string[] = [];
  for (const slice of slices) {
    if (!(slice in root)) {
      missingSlices.push(slice);
      continue;
    }
    picked[slice] = redactSlice(slice, root[slice]);
  }
  const encryptionKey = asRecord(session)?.[encryptionKeyField];
  return {
    slices: picked,
    missingSlices,
    encryptionKeyPresent: typeof encryptionKey === 'string' && encryptionKey.length > 0,
  };
}
