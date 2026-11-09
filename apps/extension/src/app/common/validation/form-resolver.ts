import type { FieldError, FieldValues, Resolver } from 'react-hook-form';

import { toNestErrors } from '@hookform/resolvers';
import { isPlainObject, mapValues } from 'remeda';
import type { z } from 'zod';

type FormSchema = z.ZodObject<Readonly<Record<string, z.ZodType>>, z.core.$ZodObjectConfig>;

type FormSchemaSource = FormSchema | ((values: unknown) => FormSchema);

function emptyStringsToUndefined(value: unknown): unknown {
  if (value === '') return undefined;
  if (Array.isArray(value)) return value.map(emptyStringsToUndefined);
  if (isPlainObject(value)) return mapValues(value, emptyStringsToUndefined);
  return value;
}

function resolveSchema(source: FormSchemaSource, values: unknown) {
  return typeof source === 'function' ? source(values) : source;
}

function toFieldErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, FieldError> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join('.');
    if (path in errors) continue;
    errors[path] = { type: issue.code, message: issue.message };
  }
  return errors;
}

export function createFormResolver<TFieldValues extends FieldValues>(
  source: FormSchemaSource
): Resolver<TFieldValues> {
  return async (values, _context, options) => {
    const preparedValues = emptyStringsToUndefined(values);
    const result = await resolveSchema(source, preparedValues).safeParseAsync(preparedValues);
    if (result.success) return { values, errors: {} };
    return { values: {}, errors: toNestErrors(toFieldErrors(result.error.issues), options) };
  };
}
