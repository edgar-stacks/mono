import { type FormEvent, memo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Stack, type StackProps } from 'leather-styles/jsx';

import { Input } from '@leather.io/ui';

import { useFieldError } from '@app/common/form-utils';
import { ErrorLabel } from '@app/components/error-label';

interface EditNonceFieldProps extends StackProps {
  onBlur(): void;
}

export const EditNonceField = memo(function EditNonceField(props: EditNonceFieldProps) {
  const { onBlur } = props;
  const { control, setValue } = useFormContext<{ nonce?: number | string }>();
  const nonce = useWatch({ control, name: 'nonce' });
  const error = useFieldError('nonce');

  return (
    <Stack width="100%" {...props}>
      <Input.Root data-has-error={error}>
        <Input.Label>Custom nonce</Input.Label>
        <Input.Field
          onBlur={onBlur}
          value={nonce}
          onChange={(evt: FormEvent<HTMLInputElement>) => {
            setValue('nonce', evt.currentTarget.value);
          }}
        />
      </Input.Root>
      {error && <ErrorLabel>{error}</ErrorLabel>}
    </Stack>
  );
});
