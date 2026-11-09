import { type ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { TokenDetailsSelectors } from '@tests/selectors/token-details.selectors';
import { Box } from 'leather-styles/jsx';

import { makeAccountIdentifer } from '@leather.io/crypto';
import type { BlockchainActivityItem } from '@leather.io/features';
import type { FungibleCryptoAsset, Money } from '@leather.io/models';
import { getAssetId, serializeAssetId } from '@leather.io/utils';

import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import type { ReceiveView } from '@app/common/receive/receive';
import { DetailsHeader } from '@app/components/details/details-header';
import { DetailsRow } from '@app/components/details/details-row';
import { DetailsScreen } from '@app/components/details/details-screen';
import { useCurrentAccountId } from '@app/store/accounts/account';
import { useSelectTokenDetailsTab } from '@app/store/settings/settings.actions';
import { useTokenDetailsTab } from '@app/store/settings/settings.selectors';
import type { TokenDetailsTab } from '@app/store/settings/settings.slice';

import { TokenPriceHistory } from './components/price-history/token-price-history';
import { type SwapChain, TokenDetailsActionsRow } from './components/token-details-actions';
import { TokenDetailsTabs, resolveVisibleTokenDetailsTab } from './components/token-details-tabs';
import { TokenOverview } from './components/token-overview';

interface TokenDetailsLayoutProps {
  icon: ReactNode;
  title: string;
  symbol: string;
  receiveView: ReceiveView;
  swapChain: SwapChain;
  balance: Money;
  fiatBalance: Money;
  name: string;
  asset: FungibleCryptoAsset;
  price?: Money;
  layer: string;
  contractDetails?: string;
  descriptionText?: string;
  balancesContent?: ReactNode;
  activity: BlockchainActivityItem[];
  isActivityLoading: boolean;
  isBuyEnabled?: boolean;
  isSwapEnabled?: boolean;
}

export function TokenDetailsLayout({
  icon,
  title,
  symbol,
  receiveView,
  swapChain,
  balance,
  fiatBalance,
  name,
  asset,
  price,
  layer,
  contractDetails = '—',
  descriptionText,
  balancesContent,
  activity,
  isActivityLoading,
  isBuyEnabled = true,
  isSwapEnabled = true,
}: TokenDetailsLayoutProps) {
  const navigate = useNavigate();
  const activeTab = resolveVisibleTokenDetailsTab(useTokenDetailsTab(), !!balancesContent);
  const selectTab = useSelectTokenDetailsTab();
  const currentAccountId = useCurrentAccountId();
  const hasPrice = !!price && price.amount.isGreaterThan(0);
  const hasBalance = balance.amount.isGreaterThan(0);
  const assetId = serializeAssetId(getAssetId(asset));
  const walletAccountId = makeAccountIdentifer(
    currentAccountId.fingerprint,
    currentAccountId.accountIndex
  );

  const landingTab = useRef({ assetId, tab: activeTab });
  if (landingTab.current.assetId !== assetId) landingTab.current = { assetId, tab: activeTab };

  useEffect(() => {
    analytics.track('token_details_viewed', {
      assetId,
      protocol: asset.protocol,
      platform: 'extension',
      walletAccountId,
      tab: landingTab.current.tab,
    });
  }, [assetId, asset.protocol, walletAccountId]);

  function handleSelectTab(tab: TokenDetailsTab) {
    selectTab(tab);
    analytics.track('token_details_tab_selected', { assetId, protocol: asset.protocol, tab });
  }

  return (
    <DetailsScreen
      header={
        <DetailsHeader
          title={title}
          onBack={() => void navigate(RouteUrls.Home)}
          backTestId={TokenDetailsSelectors.TokenDetailsBackButton}
          titleTestId={TokenDetailsSelectors.TokenDetailsTitle}
        />
      }
      testId={TokenDetailsSelectors.TokenDetailsContainer}
    >
      <TokenOverview
        icon={icon}
        balance={balance}
        symbol={symbol}
        fiatBalance={fiatBalance}
        actions={
          <TokenDetailsActionsRow
            symbol={symbol}
            assetId={assetId}
            receiveView={receiveView}
            swapChain={swapChain}
            isBuyEnabled={isBuyEnabled}
            isSwapEnabled={isSwapEnabled}
          />
        }
      />
      <TokenDetailsTabs
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        priceContent={
          hasPrice ? (
            <Box pt="space.04" pb="space.02">
              <TokenPriceHistory asset={asset} price={price} />
            </Box>
          ) : null
        }
        descriptionText={descriptionText}
        balancesContent={balancesContent}
        activity={activity}
        isActivityLoading={isActivityLoading}
        hasBalance={hasBalance}
        detailRows={
          <>
            <DetailsRow label="Name" value={name} testId="token-details-name" />
            <DetailsRow label="Layer" value={layer} testId="token-details-layer" />
            <DetailsRow label="Contract details" value={contractDetails} />
          </>
        }
      />
    </DetailsScreen>
  );
}
