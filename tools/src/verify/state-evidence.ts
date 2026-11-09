import { z } from 'zod';

export const defaultStateSlices = ['active', 'networks', 'wallets'] as const;

export const allStateSlices = 'all';

export const redactedValue = '[redacted]';

const redactedKeys = new Set(['encryptedSecretKey']);
const softwareKeysSlice = 'softwareKeys';
const softwareKeysSaltKey = 'salt';

export type StateSlicesResult = { readonly slices: readonly string[] } | { readonly error: string };

export function parseStateSlices(
  value: string | undefined,
  whitelist: readonly string[]
): StateSlicesResult {
  if (value === undefined) return { slices: [...defaultStateSlices] };
  if (value.trim() === allStateSlices) return { slices: [...whitelist] };
  const slices = [
    ...new Set(
      value
        .split(',')
        .map(slice => slice.trim())
        .filter(slice => slice.length > 0)
    ),
  ];
  if (slices.length === 0) return { error: '--state needs at least one slice or all' };
  const unknown = slices.filter(slice => !whitelist.includes(slice));
  if (unknown.length > 0) {
    return {
      error: `--state: ${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not persisted. Use all or a list of ${whitelist.join(', ')}.`,
    };
  }
  return { slices };
}

const recordSchema = z.record(z.string(), z.unknown());

function asRecord(value: unknown): Record<string, unknown> | undefined {
  const parsed = recordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDeep);
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(
    Object.entries(record).map(([key, inner]) => [
      key,
      redactedKeys.has(key) ? redactedValue : redactDeep(inner),
    ])
  );
}

function redactSlice(name: string, value: unknown): unknown {
  const redacted = redactDeep(value);
  const record = asRecord(redacted);
  if (name !== softwareKeysSlice || !record || !(softwareKeysSaltKey in record)) return redacted;
  return { ...record, [softwareKeysSaltKey]: redactedValue };
}

export interface StateEvidenceInput {
  readonly persisted: unknown;
  readonly slices: readonly string[];
  readonly encryptionKeyPresent: boolean;
}

export interface StateEvidence {
  readonly slices: Readonly<Record<string, unknown>>;
  readonly missing: readonly string[];
  readonly encryptionKeyPresent: boolean;
}

export function buildStateEvidence({
  persisted,
  slices,
  encryptionKeyPresent,
}: StateEvidenceInput): StateEvidence {
  const root = asRecord(persisted) ?? {};
  const present = slices.filter(slice => slice in root);
  return {
    slices: Object.fromEntries(present.map(slice => [slice, redactSlice(slice, root[slice])])),
    missing: slices.filter(slice => !(slice in root)),
    encryptionKeyPresent,
  };
}
