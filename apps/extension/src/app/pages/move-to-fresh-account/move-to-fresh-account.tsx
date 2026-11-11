import { MoveToFreshAccountSelectors } from '@tests/selectors/move-to-fresh-account.selectors';
import { Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, LoadingSpinner } from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { InfoCardRow, InfoCardSeparator } from '@app/components/info-card/info-card';
import { Card, Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';
import { useFreshStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

import { useMoveToFreshAccount } from './use-move-to-fresh-account';

const nftContractsCalloutLine =
  'Some NFT contracts block transfers. If one does, its transaction fails and its fee is still spent.';

interface MoveToFreshAccountCalloutProps {
  lines: string[];
}

function MoveToFreshAccountCallout({ lines }: MoveToFreshAccountCalloutProps) {
  if (lines.length === 0) return null;
  return (
    <Callout variant="info" width="100%" mb="space.04">
      <Stack gap="space.02">
        {lines.map(line => (
          <styled.span key={line}>{line}</styled.span>
        ))}
      </Stack>
    </Callout>
  );
}

export function MoveToFreshAccount() {
  const freshAddress = useFreshStacksAccountAddress();
  const {
    walletType,
    isFreshAccountAvailable,
    isLoading,
    hasError,
    plan,
    sip10s,
    movableNfts,
    stayingNfts,
    lockedStx,
    isMoving,
    move,
  } = useMoveToFreshAccount();

  function renderContent() {
    if (isLoading) return <LoadingSpinner height="200px" />;

    if (!isFreshAccountAvailable)
      return (
        <Callout
          variant="warning"
          width="100%"
          title="No fresh account available"
          data-testid={MoveToFreshAccountSelectors.MoveToFreshAccountNoFreshAccount}
        >
          The next account has already sent a transaction, cannot be derived, or a policy account is
          active.
        </Callout>
      );

    if (hasError || !plan)
      return (
        <Callout
          variant="error"
          width="100%"
          title="Unable to prepare the move"
          data-testid={MoveToFreshAccountSelectors.MoveToFreshAccountError}
        >
          Your assets could not be loaded. Try again later.
        </Callout>
      );

    if (plan.status === 'insufficient-fees')
      return (
        <Callout
          variant="warning"
          width="100%"
          title="Not enough STX to pay the fees"
          data-testid={MoveToFreshAccountSelectors.MoveToFreshAccountError}
        >
          {`Moving everything costs ${formatCurrency(plan.totalFee)} in fees.`}
        </Callout>
      );

    const calloutLines = [
      walletType === 'ledger'
        ? `Your Ledger asks you to approve each of the ${plan.transactions.length} transactions.`
        : null,
      lockedStx.amount.isGreaterThan(0)
        ? `${formatCurrency(lockedStx)} is stacked and stays behind until it unlocks.`
        : null,
      movableNfts.length > 0 ? nftContractsCalloutLine : null,
    ].filter(line => line !== null);

    return (
      <>
        <MoveToFreshAccountCallout lines={calloutLines} />
        <Stack width="100%" gap="space.02">
          <InfoCardRow title="To" value={truncateMiddle(freshAddress, 6)} />
          <InfoCardSeparator />
          <InfoCardRow title="STX" value={formatCurrency(plan.stxToMove)} />
          {sip10s.map(sip10 => (
            <InfoCardRow
              key={sip10.asset.assetId}
              title={sip10.asset.symbol}
              value={formatCurrency(sip10.crypto.availableBalance)}
            />
          ))}
          {movableNfts.map(nft => (
            <InfoCardRow
              key={`${nft.assetIdentifier}:${nft.valueHex}`}
              title="NFT"
              value={nft.name}
            />
          ))}
          {stayingNfts.length > 0 && (
            <>
              <InfoCardSeparator />
              <styled.span textStyle="label.02">Stays behind</styled.span>
              {stayingNfts.map(nft => (
                <InfoCardRow
                  key={`${nft.assetIdentifier}:${nft.valueHex}`}
                  title={nft.name}
                  value={nft.reason}
                />
              ))}
            </>
          )}
          <InfoCardSeparator />
          <InfoCardRow title="Transactions" value={String(plan.transactions.length)} />
          <InfoCardRow title="Total fee" value={formatCurrency(plan.totalFee)} />
        </Stack>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Move assets" />
      <Content>
        <Page>
          <Card
            dataTestId={MoveToFreshAccountSelectors.MoveToFreshAccountPage}
            footer={
              <Button
                width="100%"
                aria-busy={isMoving}
                disabled={!isFreshAccountAvailable || plan?.status !== 'ready' || isMoving}
                onClick={() => void move()}
                data-testid={MoveToFreshAccountSelectors.MoveToFreshAccountSubmitBtn}
              >
                Move Stacks assets
              </Button>
            }
          >
            {renderContent()}
          </Card>
        </Page>
      </Content>
    </>
  );
}
