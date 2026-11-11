import { useCallback, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { FormErrorMessages } from '@shared/error-messages';
import { logger } from '@shared/logger';
import { type RecipientFormValues } from '@shared/models/form.model';

import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

// Handles validating the BNS name lookup
export function useRecipientBnsName() {
  const { clearErrors, control, setError, setValue } = useFormContext<RecipientFormValues>();
  const recipientBnsName = useWatch({ control, name: 'recipientBnsName' });
  const [bnsAddress, setBnsAddress] = useState('');

  const currentStacksAddress = useCurrentStacksAccountAddress();

  const getBnsAddressAndValidate = useCallback(
    async (fetchFn: (name: string) => Promise<string | null>) => {
      setBnsAddress('');
      if (!recipientBnsName) return;

      try {
        const owner = await fetchFn(recipientBnsName);

        if (owner) {
          if (owner === currentStacksAddress) {
            setError('recipientBnsName', { message: FormErrorMessages.SameAddress });
            return;
          }

          setBnsAddress(owner);
          clearErrors('recipient');
          setValue('recipient', owner, { shouldDirty: true });
        } else {
          setError('recipientBnsName', { message: FormErrorMessages.BnsAddressNotFound });
        }
      } catch (e) {
        setError('recipientBnsName', { message: FormErrorMessages.BnsAddressNotFound });
        logger.error('Error fetching bns address', e);
      }
    },
    [clearErrors, currentStacksAddress, recipientBnsName, setError, setValue]
  );

  return { bnsAddress, getBnsAddressAndValidate, setBnsAddress };
}
