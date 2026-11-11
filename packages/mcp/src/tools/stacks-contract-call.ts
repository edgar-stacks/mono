import {
  type AssetString,
  type ClarityValue,
  type PostCondition,
  type PostConditionWire,
  postConditionToHex,
  serializeCV,
  serializePostConditionWire,
  validateStacksAddress,
} from '@stacks/transactions';
import { z } from 'zod';

import { clarityValueSchema } from '@leather.io/rpc';
import { getPostCondition } from '@leather.io/stacks';

const contractIdPattern = /^([A-Z0-9]+)\.([a-zA-Z]([a-zA-Z0-9]|[-_])*)$/;
const assetStringPattern = /^[A-Z0-9]+\.[a-zA-Z]([a-zA-Z0-9]|[-_])*::[a-zA-Z0-9-_]+$/;
const mainnetAddressPrefixes = ['SP', 'SM'];

export function isMainnetStacksAddress(address: string) {
  return (
    validateStacksAddress(address) &&
    mainnetAddressPrefixes.some(prefix => address.startsWith(prefix))
  );
}

export function isMainnetContractId(contractId: string) {
  const match = contractIdPattern.exec(contractId);
  return Boolean(match?.[1] && isMainnetStacksAddress(match[1]));
}

const assetStringSchema = z
  .string()
  .regex(assetStringPattern, 'Use the form ADDRESS.contract-name::asset-name')
  .pipe(z.custom<AssetString>(value => typeof value === 'string'));

const fungibleComparatorSchema = z.enum(['eq', 'gt', 'gte', 'lt', 'lte']);
const amountSchema = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]);

export const postConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stx-postcondition'),
    address: z.string(),
    condition: fungibleComparatorSchema,
    amount: amountSchema,
  }),
  z.object({
    type: z.literal('ft-postcondition'),
    address: z.string(),
    condition: fungibleComparatorSchema,
    asset: assetStringSchema,
    amount: amountSchema,
  }),
  z.object({
    type: z.literal('nft-postcondition'),
    address: z.string(),
    condition: z.enum(['sent', 'not-sent', 'maybe-sent']),
    asset: assetStringSchema,
    assetId: clarityValueSchema,
  }),
]);

export function serializeClarityValues(values: ClarityValue[]) {
  return values.map(value => serializeCV(value));
}

export function serializePostConditions(postConditions: PostCondition[]) {
  return postConditions.map(postCondition => postConditionToHex(postCondition));
}

const clarityValueInputSchema = z.custom<ClarityValue>(
  value => typeof value === 'object' && value !== null && 'type' in value,
  'Invalid Clarity value'
);

const postConditionInputSchema = z.custom<string | PostCondition | PostConditionWire>(
  value => typeof value === 'string' || (typeof value === 'object' && value !== null),
  'Invalid post condition'
);

export function serializeUnknownClarityValues(values: unknown[]) {
  return serializeClarityValues(values.map(value => clarityValueInputSchema.parse(value)));
}

export function serializeUnknownPostConditions(postConditions: unknown[]) {
  return postConditions.map(postCondition =>
    serializePostConditionWire(getPostCondition(postConditionInputSchema.parse(postCondition)))
  );
}
