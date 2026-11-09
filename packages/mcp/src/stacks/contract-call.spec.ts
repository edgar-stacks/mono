import { Cl, deserializeCV, serializeCV } from '@stacks/transactions';

import {
  clarityArgsSchema,
  describeClarityArgs,
  postConditionsSchema,
  serializeClarityArgs,
  serializePostConditions,
} from './contract-call';

const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

describe('contract call helpers', () => {
  test('serializes typed Clarity JSON arguments to hex', () => {
    const args = clarityArgsSchema.parse([
      { type: 'uint', value: '100' },
      { type: 'address', value: address },
    ]);
    const [amount, principal] = serializeClarityArgs(args);
    expect(amount).toBe(serializeCV(Cl.uint(100)));
    expect(deserializeCV(principal)).toEqual(Cl.standardPrincipal(address));
    expect(describeClarityArgs(args)).toEqual(['u100', address]);
  });

  test('rejects arguments that are not Clarity values', () => {
    expect(clarityArgsSchema.safeParse([{ type: 'number', value: 1 }]).success).toBe(false);
  });

  test('serializes STX and fungible token post-conditions', () => {
    const postConditions = postConditionsSchema.parse([
      { type: 'stx-postcondition', address, condition: 'lte', amount: 1000 },
      {
        type: 'ft-postcondition',
        address,
        condition: 'eq',
        asset: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-alex::alex',
        amount: '5',
      },
    ]);
    expect(serializePostConditions(postConditions)).toHaveLength(2);
  });

  test('rejects post-conditions with a fractional amount', () => {
    const result = postConditionsSchema.safeParse([
      { type: 'stx-postcondition', address, condition: 'eq', amount: '1.5' },
    ]);
    expect(result.success).toBe(false);
  });
});
