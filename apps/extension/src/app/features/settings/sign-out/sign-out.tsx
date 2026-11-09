import { useForm, useWatch } from 'react-hook-form';

import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { Flex, HStack, styled } from 'leather-styles/jsx';
import { mapToObj } from 'remeda';

import { Button, Callout, Sheet, SheetHeader } from '@leather.io/ui';

import { ButtonRow } from '@app/components/layout';
import { useWallets } from '@app/store/wallets/wallet.selectors';

import {
  getBackupConfirmationLabel,
  getPasswordDisableLabel,
  getSignOutCalloutBody,
  getSignOutCalloutTitle,
} from './sign-out.utils';

interface SignOutFormValues {
  backups: Record<string, boolean>;
  confirmPasswordDisable: boolean;
}

interface SignOutSheetProps {
  isShowing: boolean;
  onUserDeleteWallet(): void;
  onClose(): void;
}
export function SignOutSheet({ isShowing, onUserDeleteWallet, onClose }: SignOutSheetProps) {
  const softwareWallets = useWallets().filter(wallet => wallet.type === 'software');
  const softwareWalletCount = softwareWallets.length;
  const hasSoftwareKeys = softwareWalletCount > 0;

  const { control, handleSubmit, register } = useForm<SignOutFormValues>({
    defaultValues: {
      backups: mapToObj(softwareWallets, wallet => [wallet.fingerprint, false]),
      confirmPasswordDisable: !hasSoftwareKeys,
    },
  });
  const [backups, confirmPasswordDisable] = useWatch({
    control,
    name: ['backups', 'confirmPasswordDisable'],
  });

  const allBackedUp = softwareWallets.every(wallet => backups[wallet.fingerprint]);
  const canSignOut = allBackedUp && confirmPasswordDisable;

  function handleSignOut() {
    if (canSignOut) {
      onClose();
      onUserDeleteWallet();
    }
  }

  return (
    <Sheet
      header={<SheetHeader title="Sign out" />}
      isShowing={isShowing}
      onClose={onClose}
      footer={
        <ButtonRow flexDirection="row">
          <Button
            data-testid={SettingsSelectors.BtnSignOutReturnToHomeScreen}
            flexGrow={1}
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            opacity={!canSignOut ? 0.8 : undefined}
            data-testid={SettingsSelectors.BtnSignOutActuallyDeleteWallet}
            flexGrow={1}
            disabled={!canSignOut}
            onClick={handleSignOut}
            type="submit"
          >
            Sign out
          </Button>
        </ButtonRow>
      }
    >
      <Callout variant="warning" width="100%" title={getSignOutCalloutTitle(softwareWalletCount)}>
        {getSignOutCalloutBody(softwareWalletCount)}
      </Callout>
      <Flex alignItems="center" flexDirection="column" p="space.05">
        <form onSubmit={e => void handleSubmit(handleSignOut)(e)}>
          {softwareWallets.map((wallet, index) => (
            <styled.label
              key={wallet.fingerprint}
              alignItems="center"
              display="flex"
              mt={index === 0 ? undefined : 'space.05'}
            >
              <HStack gap="space.03">
                <input
                  type="checkbox"
                  {...register(`backups.${wallet.fingerprint}`)}
                  data-testid={`${SettingsSelectors.SignOutConfirmHasBackupCheckbox}-${wallet.fingerprint}`}
                />

                <styled.p textStyle="caption.01" userSelect="none">
                  {getBackupConfirmationLabel(wallet.name, softwareWalletCount)}
                </styled.p>
              </HStack>
            </styled.label>
          ))}
          <styled.label
            alignItems="center"
            mt="space.05"
            display={hasSoftwareKeys ? 'flex' : 'none'}
          >
            <HStack gap="space.03">
              <input
                type="checkbox"
                {...register('confirmPasswordDisable')}
                data-testid={SettingsSelectors.SignOutConfirmPasswordDisable}
              />
              <styled.p textStyle="caption.01" userSelect="none">
                {getPasswordDisableLabel(softwareWalletCount)}
              </styled.p>
            </HStack>
          </styled.label>
        </form>
      </Flex>
    </Sheet>
  );
}
