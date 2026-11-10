import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { Box } from 'leather-styles/jsx';

import { Input } from '@leather.io/ui';

import type { RecipientFieldName, RecipientFormValues } from '@shared/models/form.model';

interface RecipientAddressTypeFieldProps {
  label?: string;
  name: RecipientFieldName;
  onBlur?(): void;
  placeholder: string;
  topInputOverlay?: React.JSX.Element;
  rightLabel?: React.JSX.Element;
}
export function RecipientAddressTypeField({
  name,
  topInputOverlay,
  rightLabel,
  onBlur,
  placeholder,
}: RecipientAddressTypeFieldProps) {
  const { control, register, setValue } = useFormContext<RecipientFormValues>();
  const value = useWatch({ control, name });
  const field = register(name);

  useEffect(() => {
    const trimmedValue = value.trim();
    if (trimmedValue !== value) setValue(name, trimmedValue);
  }, [name, value, setValue]);

  return (
    <Box width="100%" position="relative" mb="space.02">
      <Input.Root shrink>
        {rightLabel && (
          <Box pos="absolute" right="space.03" zIndex={15} top="9px">
            {rightLabel}
          </Box>
        )}
        {topInputOverlay && <Input.Label>{topInputOverlay}</Input.Label>}
        <Input.Field
          data-testid={SendCryptoAssetSelectors.RecipientFieldInput}
          placeholder={placeholder}
          {...field}
          onBlur={e => {
            void field.onBlur(e);
            onBlur?.();
          }}
        />
      </Input.Root>
    </Box>
  );
}
