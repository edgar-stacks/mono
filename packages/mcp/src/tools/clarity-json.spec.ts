import { Cl } from '@stacks/transactions';

import { clarityJsonSchema, clarityJsonToHex, postConditionJsonToHex } from './clarity-json';

const address = 'SP384CVPNDTYA0E92TKJZQTYXQHNZSWGCAG7SAPVB';

describe('clarity JSON', () => {
  test('serializes nested values like the stacks.js builders', () => {
    const json = clarityJsonSchema.parse({
      type: 'tuple',
      value: {
        amount: { type: 'uint', value: '1000' },
        delta: { type: 'int', value: -5 },
        memo: { type: 'some', value: { type: 'buffer', value: '0xdeadbeef' } },
        names: { type: 'list', value: [{ type: 'string-ascii', value: 'leather' }] },
        owner: { type: 'principal', value: `${address}.vault` },
        result: { type: 'err', value: { type: 'bool', value: false } },
      },
    });

    expect(clarityJsonToHex(json)).toEqual(
      Cl.serialize(
        Cl.tuple({
          amount: Cl.uint(1000),
          delta: Cl.int(-5),
          memo: Cl.some(Cl.bufferFromHex('deadbeef')),
          names: Cl.list([Cl.stringAscii('leather')]),
          owner: Cl.contractPrincipal(address, 'vault'),
          result: Cl.error(Cl.bool(false)),
        })
      )
    );
  });

  test('rejects a negative uint', () => {
    expect(clarityJsonSchema.safeParse({ type: 'uint', value: '-1' }).success).toBe(false);
  });

  test('rejects an unknown type', () => {
    expect(clarityJsonSchema.safeParse({ type: 'float', value: 1 }).success).toBe(false);
  });

  test('encodes a fungible token post-condition', () => {
    expect(
      postConditionJsonToHex({
        type: 'ft',
        address,
        condition: 'eq',
        asset: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token',
        amount: '100',
      })
    ).toMatch(/^[0-9a-f]+$/);
  });
});
