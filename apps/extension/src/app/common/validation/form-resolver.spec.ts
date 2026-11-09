import type { FieldValues, Resolver } from 'react-hook-form';

import { z } from 'zod';

import { numberField, requiredStringField, stringField } from '@shared/forms/field-schemas';

import { createFormResolver } from './form-resolver';

function resolve<TFieldValues extends FieldValues>(
  resolver: Resolver<TFieldValues>,
  values: TFieldValues
) {
  return resolver(values, undefined, { fields: {}, shouldUseNativeValidation: false });
}

const errorMessagesSchema = z.record(
  z.string(),
  z.object({ message: z.string() }).transform(error => error.message)
);

const nestedErrorsSchema = z.object({ recipients: z.array(z.unknown()) });

async function resolveErrorMessages<TFieldValues extends FieldValues>(
  resolver: Resolver<TFieldValues>,
  values: TFieldValues
) {
  const { errors } = await resolve(resolver, values);
  return errorMessagesSchema.parse(errors);
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

  it('validates empty strings as missing values', async () => {
    const result = await resolve(resolver, { amount: '', recipient: '' });
    expect(result.values).toEqual({});
    expect(errorMessagesSchema.parse(result.errors)).toEqual({ recipient: 'Enter a recipient' });
  });

  it('reports only the first error per field', async () => {
    await expect(
      resolveErrorMessages(resolver, { amount: '-1', recipient: '   ' })
    ).resolves.toEqual({
      amount: 'Amount must be greater than zero',
      recipient: 'Enter a recipient',
    });
  });

  it('runs async checks', async () => {
    await expect(
      resolveErrorMessages(resolver, { amount: '1', recipient: 'bc1sanctioned' })
    ).resolves.toEqual({ recipient: 'Compliance check failed' });
  });

  it('stops at the type error so refinements do not see a non-number', async () => {
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
    await expect(resolveErrorMessages(spying, { amount: 'abc' })).resolves.toEqual({
      amount: 'Amount must be a number',
    });
    expect(seen).toEqual([]);
  });

  it('reports a required message for a missing value', async () => {
    const required = createFormResolver(
      z.object({ password: requiredStringField('Enter your password') })
    );
    await expect(resolveErrorMessages(required, { password: '' })).resolves.toEqual({
      password: 'Enter your password',
    });
  });

  it('nests errors of nested field paths', async () => {
    const nested = createFormResolver(
      z.object({
        recipients: z.array(
          z.object({ address: requiredStringField('Enter an address'), label: stringField() })
        ),
      })
    );
    const result = await resolve(nested, {
      recipients: [
        { address: 'ok', label: '' },
        { address: '', label: '' },
      ],
    });
    const { recipients } = nestedErrorsSchema.parse(result.errors);
    expect(recipients[0]).toBeUndefined();
    expect(errorMessagesSchema.parse(recipients[1])).toEqual({ address: 'Enter an address' });
  });

  it('builds the schema from the values being validated when given a builder', async () => {
    const builder = createFormResolver((values: { amount: string; max: number }) =>
      z.object({
        amount: numberField('Amount must be a number').check(
          z.refine<number | undefined>(value => value !== undefined && value <= values.max, {
            error: 'Too much',
          })
        ),
        max: numberField('Max must be a number'),
      })
    );
    const valid = { amount: '5', max: 10 };
    await expect(resolve(builder, valid)).resolves.toEqual({ values: valid, errors: {} });
    await expect(resolveErrorMessages(builder, { amount: '50', max: 10 })).resolves.toEqual({
      amount: 'Too much',
    });
  });
});
