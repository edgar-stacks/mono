import type { ResolverOptions } from 'react-hook-form';

import { z } from 'zod';

import { numberField, requiredStringField, stringField } from '@shared/forms/field-schemas';

import { createFormResolver } from './form-resolver';

const resolverOptions: ResolverOptions<Record<string, unknown>> = {
  fields: {},
  shouldUseNativeValidation: false,
};

function errorsOf(result: { errors: unknown }) {
  return result.errors;
}

describe(createFormResolver.name, () => {
  const resolver = createFormResolver<Record<string, unknown>>(
    z.object({
      amount: numberField('Amount must be a number').check(
        z.refine<number | undefined>(value => value === undefined || value > 0, {
          error: 'Amount must be greater than zero',
        }),
        z.refine<number | undefined>(value => value === undefined || value <= 10, {
          error: 'Insufficient funds',
        })
      ),
      recipient: stringField().check(
        z.refine<string | undefined>(value => value !== undefined && value.trim() !== '', {
          error: 'Enter a recipient',
        }),
        z.refine<string | undefined>(value => value === undefined || value.startsWith('bc1'), {
          error: 'Address is not valid',
        }),
        z.refine<string | undefined>(value => Promise.resolve(value !== 'bc1sanctioned'), {
          error: 'Compliance check failed',
        })
      ),
    })
  );

  it('returns the raw values when every field is valid', async () => {
    const values = { amount: '1', recipient: 'bc1valid' };
    await expect(resolver(values, undefined, resolverOptions)).resolves.toEqual({
      values,
      errors: {},
    });
  });

  it('validates empty strings as missing values', async () => {
    const result = await resolver({ amount: '', recipient: '' }, undefined, resolverOptions);
    expect(result.values).toEqual({});
    expect(errorsOf(result)).toEqual({
      recipient: { type: 'custom', message: 'Enter a recipient', ref: undefined },
    });
  });

  it('reports only the first error per field', async () => {
    const result = await resolver(
      { amount: '-1', recipient: 'bc1sanctioned' },
      undefined,
      resolverOptions
    );
    expect(errorsOf(result)).toEqual({
      amount: { type: 'custom', message: 'Amount must be greater than zero', ref: undefined },
      recipient: { type: 'custom', message: 'Compliance check failed', ref: undefined },
    });
  });

  it('keeps the first error when later checks of the same field also fail', async () => {
    const result = await resolver({ amount: '1', recipient: '   ' }, undefined, resolverOptions);
    expect(errorsOf(result)).toEqual({
      recipient: { type: 'custom', message: 'Enter a recipient', ref: undefined },
    });
  });

  it('stops at the type error so refinements do not see a non-number', async () => {
    const seen: unknown[] = [];
    const spying = createFormResolver<Record<string, unknown>>(
      z.object({
        amount: numberField('Amount must be a number').check(
          z.refine<number | undefined>(value => {
            seen.push(value);
            return true;
          })
        ),
      })
    );
    const result = await spying({ amount: 'abc' }, undefined, resolverOptions);
    expect(errorsOf(result)).toEqual({
      amount: { type: 'custom', message: 'Amount must be a number', ref: undefined },
    });
    expect(seen).toEqual([]);
  });

  it('reports the required message for a missing value', async () => {
    const required = createFormResolver<Record<string, unknown>>(
      z.object({ password: requiredStringField('Enter your password') })
    );
    const result = await required({ password: '' }, undefined, resolverOptions);
    expect(errorsOf(result)).toEqual({
      password: { type: 'invalid_type', message: 'Enter your password', ref: undefined },
    });
  });

  it('nests errors of nested fields by their dotted path', async () => {
    const nested = createFormResolver<Record<string, unknown>>(
      z.object({
        recipients: z.array(z.object({ address: z.string('Enter an address') })),
      })
    );
    const result = await nested(
      { recipients: [{ address: 'ok' }, { address: '' }] },
      undefined,
      resolverOptions
    );
    expect(errorsOf(result)).toEqual({
      recipients: [
        undefined,
        { address: { type: 'invalid_type', message: 'Enter an address', ref: undefined } },
      ],
    });
  });

  it('builds the schema from the values being validated when given a builder', async () => {
    const builder = createFormResolver<Record<string, unknown>>(values =>
      z.object({
        amount: numberField('Amount must be a number').check(
          z.refine<number | undefined>(
            value =>
              typeof values === 'object' &&
              values !== null &&
              'max' in values &&
              typeof values.max === 'number' &&
              value !== undefined &&
              value <= values.max,
            { error: 'Too much' }
          )
        ),
        max: numberField('Max must be a number'),
      })
    );
    await expect(builder({ amount: '5', max: 10 }, undefined, resolverOptions)).resolves.toEqual({
      values: { amount: '5', max: 10 },
      errors: {},
    });
    const result = await builder({ amount: '50', max: 10 }, undefined, resolverOptions);
    expect(errorsOf(result)).toEqual({
      amount: { type: 'custom', message: 'Too much', ref: undefined },
    });
  });
});
