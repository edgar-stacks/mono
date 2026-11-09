import {
  type AssetString,
  Cl,
  type ClarityValue,
  type PostCondition,
  postConditionToHex,
} from '@stacks/transactions';
import { mapValues } from 'remeda';
import { z } from 'zod';

const unsignedIntegerSchema = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]);
const signedIntegerSchema = z.union([z.string().regex(/^-?\d+$/), z.number().int()]);
const hexSchema = z.string().regex(/^(0x)?([0-9a-fA-F]{2})*$/, 'Expected hex bytes');
const assetStringRegex = /^([A-Z0-9]+)\.([a-zA-Z][\w-]*)::([\w-]+)$/;

type ClarityJson =
  | { type: 'uint'; value: string | number }
  | { type: 'int'; value: string | number }
  | { type: 'bool'; value: boolean }
  | { type: 'principal'; value: string }
  | { type: 'string-ascii'; value: string }
  | { type: 'string-utf8'; value: string }
  | { type: 'buffer'; value: string }
  | { type: 'none' }
  | { type: 'some'; value: ClarityJson }
  | { type: 'ok'; value: ClarityJson }
  | { type: 'err'; value: ClarityJson }
  | { type: 'list'; value: ClarityJson[] }
  | { type: 'tuple'; value: Record<string, ClarityJson> };

export const clarityJsonSchema: z.ZodType<ClarityJson> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('uint'), value: unsignedIntegerSchema }),
    z.object({ type: z.literal('int'), value: signedIntegerSchema }),
    z.object({ type: z.literal('bool'), value: z.boolean() }),
    z.object({ type: z.literal('principal'), value: z.string().min(1) }),
    z.object({ type: z.literal('string-ascii'), value: z.string() }),
    z.object({ type: z.literal('string-utf8'), value: z.string() }),
    z.object({ type: z.literal('buffer'), value: hexSchema }),
    z.object({ type: z.literal('none') }),
    z.object({ type: z.literal('some'), value: clarityJsonSchema }),
    z.object({ type: z.literal('ok'), value: clarityJsonSchema }),
    z.object({ type: z.literal('err'), value: clarityJsonSchema }),
    z.object({ type: z.literal('list'), value: z.array(clarityJsonSchema) }),
    z.object({ type: z.literal('tuple'), value: z.record(z.string(), clarityJsonSchema) }),
  ])
);

const fungibleComparatorSchema = z.enum(['eq', 'gt', 'gte', 'lt', 'lte']);
const assetIdentifierSchema = z
  .string()
  .regex(assetStringRegex, 'Expected <contract address>.<contract name>::<asset name>');

export const postConditionJsonSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stx'),
    address: z.string().min(1),
    condition: fungibleComparatorSchema,
    amount: unsignedIntegerSchema.describe('Amount in micro-STX'),
  }),
  z.object({
    type: z.literal('ft'),
    address: z.string().min(1),
    condition: fungibleComparatorSchema,
    asset: assetIdentifierSchema,
    amount: unsignedIntegerSchema.describe('Amount in the token’s smallest unit'),
  }),
  z.object({
    type: z.literal('nft'),
    address: z.string().min(1),
    condition: z.enum(['sent', 'not-sent', 'maybe-sent']),
    asset: assetIdentifierSchema,
    assetId: clarityJsonSchema,
  }),
]);

type PostConditionJson = z.infer<typeof postConditionJsonSchema>;

function toClarityValue(json: ClarityJson): ClarityValue {
  switch (json.type) {
    case 'uint':
      return Cl.uint(BigInt(json.value));
    case 'int':
      return Cl.int(BigInt(json.value));
    case 'bool':
      return Cl.bool(json.value);
    case 'principal':
      return Cl.principal(json.value);
    case 'string-ascii':
      return Cl.stringAscii(json.value);
    case 'string-utf8':
      return Cl.stringUtf8(json.value);
    case 'buffer':
      return Cl.bufferFromHex(json.value.replace(/^0x/, ''));
    case 'none':
      return Cl.none();
    case 'some':
      return Cl.some(toClarityValue(json.value));
    case 'ok':
      return Cl.ok(toClarityValue(json.value));
    case 'err':
      return Cl.error(toClarityValue(json.value));
    case 'list':
      return Cl.list(json.value.map(toClarityValue));
    case 'tuple':
      return Cl.tuple(mapValues(json.value, toClarityValue));
    default:
      throw new Error('Unsupported Clarity value type');
  }
}

export function clarityJsonToHex(json: ClarityJson) {
  return Cl.serialize(toClarityValue(json));
}

function toAssetString(asset: string): AssetString {
  const match = assetStringRegex.exec(asset);
  if (!match) throw new Error(`Invalid asset identifier ${asset}`);
  const [, contractAddress, contractName, assetName] = match;
  return `${contractAddress}.${contractName}::${assetName}`;
}

function toPostCondition(json: PostConditionJson): PostCondition {
  switch (json.type) {
    case 'stx':
      return {
        type: 'stx-postcondition',
        address: json.address,
        condition: json.condition,
        amount: json.amount,
      };
    case 'ft':
      return {
        type: 'ft-postcondition',
        address: json.address,
        condition: json.condition,
        asset: toAssetString(json.asset),
        amount: json.amount,
      };
    case 'nft':
      return {
        type: 'nft-postcondition',
        address: json.address,
        condition: json.condition,
        asset: toAssetString(json.asset),
        assetId: toClarityValue(json.assetId),
      };
    default:
      throw new Error('Unsupported post-condition type');
  }
}

export function postConditionJsonToHex(json: PostConditionJson) {
  return postConditionToHex(toPostCondition(json));
}
