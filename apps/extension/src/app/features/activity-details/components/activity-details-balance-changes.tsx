import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Stack, styled } from 'leather-styles/jsx';

import { getBlockchainActivityOperator } from '@leather.io/features';
import type { BlockchainActivityBalanceChange, CryptoAsset } from '@leather.io/models';
import { BlockchainActivityAvatarIcon, ListItemBox } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { Balance } from '@app/components/balance/balance';
import { DetailsSection } from '@app/components/details/details-section';

const hiddenSymbolOptions = { showCurrency: false };

function assetLabel(asset: CryptoAsset) {
  return asset.category === 'fungible' ? asset.symbol : asset.name;
}

interface ActivityDetailsBalanceChangesProps {
  balanceChanges: BlockchainActivityBalanceChange[];
}

export function ActivityDetailsBalanceChanges({
  balanceChanges,
}: ActivityDetailsBalanceChangesProps) {
  if (balanceChanges.length === 0) return null;
  const orderedChanges = [
    ...balanceChanges.filter(change => change.direction === 'received'),
    ...balanceChanges.filter(change => change.direction === 'sent'),
  ];
  return (
    <DetailsSection
      title="Balance changes"
      testId={ActivitySelectors.ActivityDetailsBalanceChanges}
    >
      <Stack gap="space.00" px="space.01">
        {orderedChanges.map((change, index) => (
          <ListItemBox
            key={`${change.direction}-${index}`}
            leading={
              <BlockchainActivityAvatarIcon avatar={{ kind: 'single', asset: change.asset }} />
            }
            title={
              <styled.span textStyle="label.02">
                {change.direction === 'received' ? 'Received' : 'Sent'}
              </styled.span>
            }
            caption={assetLabel(change.asset)}
            trailing={
              <Balance
                balance={change.amount.crypto}
                operator={getBlockchainActivityOperator(change.direction)}
                formattingOptions={hiddenSymbolOptions}
                color={
                  change.direction === 'received'
                    ? 'green.action-primary-default'
                    : 'ink.text-primary'
                }
                textStyle="label.02"
                whiteSpace="nowrap"
                formatCurrency={formatCurrency}
              />
            }
            trailingCaption={
              <Balance
                balance={change.amount.quote}
                color="ink.text-subdued"
                textStyle="caption.01"
                whiteSpace="nowrap"
                formatCurrency={formatCurrency}
              />
            }
          />
        ))}
      </Stack>
    </DetailsSection>
  );
}
