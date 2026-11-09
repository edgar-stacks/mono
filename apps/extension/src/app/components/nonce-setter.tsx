import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

import { isDefined } from '@leather.io/utils';

import {
  type StacksSendFormValues,
  type StacksTransactionFormValues,
} from '@shared/models/form.model';

import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

export function NonceSetter() {
  const { getFieldState, getValues, setValue } = useFormContext<
    StacksSendFormValues | StacksTransactionFormValues
  >();
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const policy = useCurrentPolicy();
  const isStacksPolicy = policy?.chain === 'stacks';

  useEffect(() => {
    if (isStacksPolicy) return;
    if (
      isDefined(nextNonce?.nonce) &&
      !getFieldState('nonce').isTouched &&
      getValues('nonce') !== nextNonce?.nonce
    ) {
      setValue('nonce', nextNonce?.nonce, { shouldDirty: true });
    }
  }, [getFieldState, getValues, nextNonce?.nonce, isStacksPolicy, setValue]);

  return <></>;
}
