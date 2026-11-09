import type { FieldValues, ResolverOptions } from 'react-hook-form';

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

function errorMessagesOf(errors: Record<string, unknown>) {
  const flattened: Record<string, unknown> = {};
  function walk(value: unknown, path: string[]) {
    if (typeof value !== 'object' || value === null) return;
    if ('message' in value && 'type' in value) {
      flattened[path.join('.')] = value.message;
      return;
    }
    for (const [key, child] of Object.entries(value)) walk(child, [...path, key]);
  }
  walk(errors, []);
  return flattened;
}

describe(createFormResolver.name, () => {
  const resolver = createFormResolver(
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
    await expect(resolve(resolver, values)).resolves.toEqual({ values, errors: {} });
  });

  it('treats empty strings as missing values', async () => {
    const seen: unknown[] = [];
    const spying = createFormResolver(
      z.object({
        memo: stringField().check(
          z.refine<string | undefined>(value => {
            seen.push(value);
            return true;
          })
        ),
        words: z.array(z.unknown()).check(
          z.refine<unknown[]>(value => {
            seen.push(value);
            return true;
          })
        ),
        nested: z.object({ name: z.unknown() }).check(
          z.refine<{ name?: unknown }>(value => {
            seen.push(value);
            return true;
          })
        ),
      })
    );
    const values = { memo: '', words: ['', 'abandon'], nested: { name: '' } };
    await expect(resolve(spying, values)).resolves.toEqual({ values, errors: {} });
    expect(seen).toEqual([undefined, [undefined, 'abandon'], { name: undefined }]);
  });

  it('reports only the first failing check per field', async () => {
    const result = await resolve(resolver, { amount: '-1', recipient: '   ' });
    expect(result.values).toEqual({});
    expect(errorMessagesOf(result.errors)).toEqual({
      amount: 'Amount must be greater than zero',
      recipient: 'Enter a recipient',
    });
  });

  it('reports async checks of a field', async () => {
    const result = await resolve(resolver, { amount: '1', recipient: 'bc1sanctioned' });
    expect(errorMessagesOf(result.errors)).toEqual({ recipient: 'Compliance check failed' });
  });

  it('stops at the type error so later checks do not see a non-number', async () => {
    const seen: unknown[] = [];
    const spying = createFormResolver(
      z.object({
        amount: numberField('Amount must be a number').check(
          z.refine<number | undefined>(value => {
            seen.push(value);
            return true;
          })
        ),
      })
    );
    const result = await resolve(spying, { amount: 'abc' });
    expect(errorMessagesOf(result.errors)).toEqual({ amount: 'Amount must be a number' });
    expect(seen).toEqual([]);
  });

  it('reports a required message for an empty value', async () => {
    const required = createFormResolver(
      z.object({ password: requiredStringField('Enter your password') })
    );
    const result = await resolve(required, { password: '' });
    expect(errorMessagesOf(result.errors)).toEqual({ password: 'Enter your password' });
  });

  it('nests errors of nested fields under their dotted paths', async () => {
    const nested = createFormResolver(
      z.object({
        recipients: z.array(z.object({ address: requiredStringField('Enter an address') })),
      })
    );
    const result = await resolve(nested, { recipients: [{ address: 'ok' }, { address: '' }] });
    expect(errorMessagesOf(result.errors)).toEqual({
      'recipients.1.address': 'Enter an address',
    });
  });

  it('builds the schema from the values being validated when given a builder', async () => {
    const builder = createFormResolver((values: unknown) =>
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
    await expect(resolve(builder, { amount: '5', max: 10 })).resolves.toEqual({
      values: { amount: '5', max: 10 },
      errors: {},
    });
    const result = await resolve(builder, { amount: '50', max: 10 });
    expect(errorMessagesOf(result.errors)).toEqual({ amount: 'Too much' });
  });
});
