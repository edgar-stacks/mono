import {
  type AssetString,
  type ClarityValue,
  type PostCondition,
  type PostConditionWire,
  cvToString,
  postConditionToHex,
  serializeCV,
  serializePostConditionWire,
} from '@stacks/transactions';
import { z } from 'zod';

import { clarityValueSchema } from '@leather.io/rpc';
import { ensurePostConditionWireFormat } from '@leather.io/stacks';

const assetStringPattern = /^[^.:]+\.[^.:]+::[^.:]+$/;
const integerAmountPattern = /^\d+$/;

const assetStringSchema = z.custom<AssetString>(
  value => typeof value === 'string' && assetStringPattern.test(value),
  'Expected an asset identifier such as SP000.contract::token'
);

const fungibleComparatorSchema = z.enum(['eq', 'gt', 'gte', 'lt', 'lte']);
const integerAmountSchema = z
  .union([z.string(), z.number().int().nonnegative()])
  .transform(String)
  .pipe(z.string().regex(integerAmountPattern, 'Expected an integer amount in base units'));

const postConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stx-postcondition'),
    address: z.string(),
    condition: fungibleComparatorSchema,
    amount: integerAmountSchema,
  }),
  z.object({
    type: z.literal('ft-postcondition'),
    address: z.string(),
    condition: fungibleComparatorSchema,
    asset: assetStringSchema,
    amount: integerAmountSchema,
  }),
  z.object({
    type: z.literal('nft-postcondition'),
    address: z.string(),
    condition: z.enum(['sent', 'not-sent', 'maybe-sent']),
    asset: assetStringSchema,
    assetId: clarityValueSchema,
  }),
]);

const providerClarityValueSchema = z.custom<ClarityValue>(
  value => typeof value === 'object' && value !== null && 'type' in value,
  'Invalid Clarity value'
);

const providerPostConditionSchema = z.custom<string | PostCondition | PostConditionWire>(
  value => typeof value === 'string' || (typeof value === 'object' && value !== null),
  'Invalid post condition'
);

export const clarityArgsSchema = z.array(clarityValueSchema);
export const postConditionsSchema = z.array(postConditionSchema);

export function serializeClarityArgs(args: ClarityValue[]) {
  return args.map(arg => serializeCV(arg));
}

export function describeClarityArgs(args: ClarityValue[]) {
  return args.map(arg => cvToString(arg));
}

export function serializePostConditions(postConditions: PostCondition[]) {
  return postConditions.map(postCondition => postConditionToHex(postCondition));
}

export function serializeProviderClarityArgs(args: unknown[]) {
  return args.map(arg => serializeCV(providerClarityValueSchema.parse(arg)));
}

export function serializeProviderPostConditions(postConditions: unknown[]) {
  return postConditions.map(postCondition =>
    serializePostConditionWire(
      ensurePostConditionWireFormat(providerPostConditionSchema.parse(postCondition))
    )
  );
}
