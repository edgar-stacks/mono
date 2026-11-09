import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, LoadingSpinner } from '@leather.io/ui';

import { RouteUrls } from '@shared/route-urls';

import { formatCurrency } from '@app/common/currency-formatter';
import { Content } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';

import { useMoveToFreshAccount } from './use-move-to-fresh-account';

interface MoveRowProps {
  label: string;
  value?: string;
}

function MoveRow({ label, value }: MoveRowProps) {
  return (
    <Flex justifyContent="space-between" gap="space.03" py="space.02">
      <styled.span textStyle="label.02" wordBreak="break-all">
        {label}
      </styled.span>
      {value && (
        <styled.span textStyle="label.02" color="ink.text-subdued" textAlign="right">
          {value}
        </styled.span>
      )}
    </Flex>
  );
}

interface MoveSectionProps {
  title: string;
  children: React.ReactNode;
}

function MoveSection({ title, children }: MoveSectionProps) {
  return (
    <Stack gap="space.01">
      <styled.span textStyle="label.03" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Stack>
  );
}

export function MoveToFreshAccount() {
  const {
    isLoading,
    isFreshAccountAvailable,
    isLedger,
    freshAddress,
    plan,
    planError,
    sip10s,
    movableNfts,
    stayBehind,
    lockedStx,
    isMoving,
    move,
  } = useMoveToFreshAccount();

  function renderBody() {
    if (isLoading) return <LoadingSpinner height="300px" />;

    if (!isFreshAccountAvailable)
      return (
        <Callout variant="warning" title="No fresh account available">
          The next account has already been used, or this is a policy account.
        </Callout>
      );

    if (planError || !plan) return <Callout variant="error" title="Unable to prepare the move" />;

    if (plan.status === 'error') return <Callout variant="error" title={plan.message} />;

    const calloutLines = [
      isLedger ? 'Your Ledger asks you to approve each transaction.' : undefined,
      lockedStx
        ? `${formatCurrency(lockedStx)} is stacked and stays behind until it unlocks.`
        : undefined,
      movableNfts.length > 0
        ? 'Some NFT contracts block transfers. If one does, its transaction fails and its fee is still spent.'
        : undefined,
    ].filter(line => line !== undefined);

    return (
      <Stack gap="space.05">
        <MoveSection title="Fresh address">
          <styled.span textStyle="label.02" wordBreak="break-all">
            {freshAddress}
          </styled.span>
        </MoveSection>
        <MoveSection title="Moves">
          <MoveRow label="STX" value={formatCurrency(plan.stxToMove)} />
          {sip10s.map(sip10 => (
            <MoveRow
              key={sip10.asset.assetId}
              label={sip10.asset.symbol}
              value={formatCurrency(sip10.crypto.availableBalance)}
            />
          ))}
          {movableNfts.map(nft => (
            <MoveRow key={`${nft.assetIdentifier}:${nft.tokenIdHex}`} label={nft.name} />
          ))}
        </MoveSection>
        {(stayBehind.length > 0 || lockedStx) && (
          <MoveSection title="Stays behind">
            {lockedStx && (
              <MoveRow label={`${formatCurrency(lockedStx)} stacked`} value="Until it unlocks." />
            )}
            {stayBehind.map((item, index) => (
              <MoveRow key={`${item.label}-${index}`} label={item.label} value={item.reason} />
            ))}
          </MoveSection>
        )}
        <MoveSection title="Summary">
          <MoveRow label="Transactions" value={String(plan.transactions.length)} />
          <MoveRow label="Total fee" value={formatCurrency(plan.totalFee)} />
        </MoveSection>
        {calloutLines.length > 0 && (
          <Callout variant="info">
            <Stack gap="space.02">
              {calloutLines.map(line => (
                <styled.span key={line}>{line}</styled.span>
              ))}
            </Stack>
          </Callout>
        )}
      </Stack>
    );
  }

  return (
    <>
      <PageHeader
        title="Move assets"
        isSettingsVisibleOnSm={false}
        onBackLocation={RouteUrls.Home}
      />
      <Content>
        <Stack gap="space.05" px="space.05" py="space.05" width="100%">
          {renderBody()}
          <Button
            fullWidth
            disabled={plan?.status !== 'ready' || !isFreshAccountAvailable}
            aria-busy={isMoving}
            onClick={() => void move()}
          >
            Move Stacks assets
          </Button>
        </Stack>
      </Content>
    </>
  );
}
