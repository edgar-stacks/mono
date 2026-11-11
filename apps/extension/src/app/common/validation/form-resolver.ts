import type { FieldError, FieldValues, Resolver } from 'react-hook-form';

import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { isPlainObject, mapValues } from 'remeda';
import type { z } from 'zod';

type FormSchema = z.ZodObject<Readonly<Record<string, z.ZodType>>, z.core.$ZodObjectConfig>;

type FormSchemaSource = FormSchema | ((values: unknown) => FormSchema);

function emptyStringToUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(emptyStringToUndefined);
  if (isPlainObject(value)) return mapValues(value, entry => emptyStringToUndefined(entry));
  return value === '' ? undefined : value;
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
    const prepared = emptyStringToUndefined(values);
    const result = await resolveSchema(source, prepared).safeParseAsync(prepared);

    if (result.success) {
      if (options.shouldUseNativeValidation) validateFieldsNatively({}, options);
      return { values, errors: {} };
    }

    return {
      values: {},
      errors: toNestErrors(toFieldErrors(result.error.issues), options),
    };
  };
}
