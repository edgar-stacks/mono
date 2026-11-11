import { type FieldValues, type ResolverOptions, get } from 'react-hook-form';

import { z } from 'zod';

import { numberField, requiredStringField, stringField } from '@shared/forms/field-schemas';

import { createFormResolver } from './form-resolver';

const resolverOptions: ResolverOptions<FieldValues> = {
  fields: {},
  shouldUseNativeValidation: false,
};

function resolve(resolver: ReturnType<typeof createFormResolver>, values: FieldValues) {
  return resolver(values, undefined, resolverOptions);
}

const sendFormResolver = createFormResolver(
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
        error: '',
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

describe(createFormResolver.name, () => {
  it('returns the raw values when every field is valid', async () => {
    const values = { amount: '1', recipient: 'bc1valid' };
    const result = await resolve(sendFormResolver, values);
    expect(result.errors).toEqual({});
    expect(result.values).toBe(values);
  });

  it('validates empty strings as missing values, also inside arrays and objects', async () => {
    const seen: unknown[] = [];
    const resolver = createFormResolver(
      z.object({
        password: requiredStringField('Enter your password'),
        tags: z.array(
          z.unknown().check(
            z.refine(value => {
              seen.push(value);
              return true;
            })
          )
        ),
        nested: z.object({
          note: z.unknown().check(
            z.refine(value => {
              seen.push(value);
              return true;
            })
          ),
        }),
      })
    );
    const result = await resolve(resolver, {
      password: '',
      tags: ['', 'tag'],
      nested: { note: '' },
    });
    expect(get(result.errors, 'password.message')).toBe('Enter your password');
    expect(seen).toEqual([undefined, 'tag', undefined]);
  });

  it('reports only the first failing check of each field', async () => {
    const result = await resolve(sendFormResolver, { amount: '-1', recipient: '   ' });
    expect(get(result.errors, 'amount.message')).toBe('Amount must be greater than zero');
    expect(get(result.errors, 'recipient.message')).toBe('');
  });

  it('runs async checks and reports their message', async () => {
    const result = await resolve(sendFormResolver, { amount: '1', recipient: 'bc1sanctioned' });
    expect(get(result.errors, 'amount')).toBeUndefined();
    expect(get(result.errors, 'recipient.message')).toBe('Compliance check failed');
  });

  it('reports the type error before refinements see a non-number', async () => {
    const seen: unknown[] = [];
    const resolver = createFormResolver(
      z.object({
        amount: numberField('Amount must be a number').check(
          z.refine<number | undefined>(value => {
            seen.push(value);
            return true;
          })
        ),
      })
    );
    const result = await resolve(resolver, { amount: 'abc' });
    expect(get(result.errors, 'amount.message')).toBe('Amount must be a number');
    expect(seen).toEqual([]);
  });

  it('reports a required message for a missing value', async () => {
    const resolver = createFormResolver(
      z.object({ password: requiredStringField('Enter your password') })
    );
    const result = await resolve(resolver, {});
    expect(get(result.errors, 'password.message')).toBe('Enter your password');
  });

  it('nests errors of nested fields by their dotted path', async () => {
    const resolver = createFormResolver(
      z.object({
        recipients: z.array(z.object({ address: z.string('Enter an address') })),
      })
    );
    const result = await resolve(resolver, {
      recipients: [{ address: 'ok' }, { address: '' }],
    });
    expect(get(result.errors, 'recipients.1.address.message')).toBe('Enter an address');
    expect(get(result.errors, 'recipients.0')).toBeUndefined();
  });

  it('builds the schema from the values being validated when given a builder', async () => {
    const resolver = createFormResolver((values: unknown) =>
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
    expect((await resolve(resolver, { amount: '5', max: 10 })).errors).toEqual({});
    const result = await resolve(resolver, { amount: '50', max: 10 });
    expect(get(result.errors, 'amount.message')).toBe('Too much');
  });
});
