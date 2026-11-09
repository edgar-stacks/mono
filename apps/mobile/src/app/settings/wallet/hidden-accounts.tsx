import SettingsLayout from '@/features/settings/settings-layout';
import { WalletsList } from '@/features/settings/wallet-and-accounts/wallets-list';
import { WalletSettingsSelectors } from '@/shared/selectors/wallet-settings.selectors';
import { t } from '@lingui/core/macro';

export default function HiddenAccountsScreen() {
  return (
    <SettingsLayout
      title={t`Hidden accounts`}
      testID={WalletSettingsSelectors.HiddenAccountsScreen}
    >
      <WalletsList variant="hidden" />
    </SettingsLayout>
  );
}
