import { Outlet, useNavigate, useOutletContext } from 'react-router';

import { RouteUrls } from '@shared/route-urls';

import type { SwitchAccountOutletContext } from '@app/common/switch-account/switch-account';
import { BitcoinUtxosLoader } from '@app/components/loaders/bitcoin-utxos-loader';
import { FullPageLoadingSpinner } from '@app/components/loading-spinner';
import { BitcoinFeeEditorProvider } from '@app/features/fee-editor/bitcoin/bitcoin-fee-editor.provider';
import { useCurrentBtcBalanceWithFallback } from '@app/query/bitcoin/balance/btc-balance.hooks';
import { useCryptoCurrencyMarketData } from '@app/query/common/market-data/market-data.hooks';
import { useAccountRequest } from '@app/services/accounts/use-account-request';

import { RpcSendTransferProvider } from './rpc-send-transfer.context';
import { useRpcSendTransfer } from './use-rpc-send-transfer';

export function RpcSendTransferContainer() {
  const sendTransferState = useRpcSendTransfer();
  const btcMarketData = useCryptoCurrencyMarketData('BTC');
  const { isLoading: isLoadingBalance, btc: btcBalance } = useCurrentBtcBalanceWithFallback();
  const account = useAccountRequest();
  const outletContext = useOutletContext<SwitchAccountOutletContext>();

  const navigate = useNavigate();

  const { recipients } = sendTransferState;

  return (
    <BitcoinUtxosLoader>
      {utxos => (
        <BitcoinFeeEditorProvider
          account={account}
          availableBalance={btcBalance.availableBalance}
          isSendingMax={false}
          loadingFallback={<FullPageLoadingSpinner />}
          marketData={btcMarketData}
          onGoBack={() => void navigate(RouteUrls.RpcSendTransfer)}
          recipients={recipients}
          utxos={utxos}
        >
          <RpcSendTransferProvider
            value={{
              ...sendTransferState,
              isLoadingBalance,
              utxos,
            }}
          >
            <Outlet context={outletContext} />
          </RpcSendTransferProvider>
        </BitcoinFeeEditorProvider>
      )}
    </BitcoinUtxosLoader>
  );
}
