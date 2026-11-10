import { useFormContext } from 'react-hook-form';

import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { Box } from 'leather-styles/jsx';

import { Input } from '@leather.io/ui';

import type { StacksSendFormValues } from '@shared/models/form.model';

import { useShowFieldError } from '@app/common/form-utils';
import { TextInputFieldError } from '@app/components/field-error';

const name = 'memo';

export function MemoField() {
  const { register } = useFormContext<Pick<StacksSendFormValues, 'memo'>>();

  const showError = useShowFieldError(name);

  return (
    <Box width="100%" mt="space.04">
      <Input.Root hasError={!!showError}>
        <Input.Label>Memo</Input.Label>
        <Input.Field data-testid={SendCryptoAssetSelectors.MemoFieldInput} {...register(name)} />
      </Input.Root>
      <Box mt="space.02">
        <TextInputFieldError name={name} />
      </Box>
    </Box>
  );
}
