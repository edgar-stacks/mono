import type { ReactNode } from 'react';

import { MoveToFreshAccountSelectors } from '@tests/selectors/move-to-fresh-account.selectors';
import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, LoadingSpinner } from '@leather.io/ui';
import { assertUnreachable, isDefined } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { ButtonRow, Card, Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';

import type { MovePlan } from './move-to-fresh-account.utils';
import { useMoveToFreshAccount } from './use-move-to-fresh-account';

const ledgerApprovalLine = 'Your Ledger asks you to approve each transaction.';
const nftContractsLine =
  'Some NFT contracts block transfers. If one does, its transaction fails and its fee is still spent.';
const stacksAssetsLabel = 'Move Stacks assets';

interface MoveRowProps {
  label: string;
  value: string;
}
function MoveRow({ label, value }: MoveRowProps) {
  return (
    <Flex justifyContent="space-between" gap="space.04">
      <styled.span textStyle="label.02">{label}</styled.span>
      <styled.span textStyle="label.02" textAlign="right" wordBreak="break-all">
        {value}
      </styled.span>
    </Flex>
  );
}

interface MoveSectionProps {
  title: string;
  children: ReactNode;
}
function MoveSection({ title, children }: MoveSectionProps) {
  return (
    <Stack gap="space.02">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Stack>
  );
}

function getTransferLabel(transfer: MovePlan['transfers'][number]) {
  switch (transfer.kind) {
    case 'sip10':
      return { label: transfer.token.symbol, value: formatCurrency(transfer.token.amount) };
    case 'nft':
      return { label: 'NFT', value: transfer.nft.name };
    case 'stx':
      return { label: 'STX', value: formatCurrency(transfer.amount) };
    default:
      return assertUnreachable(transfer);
  }
}

export function MoveToFreshAccountPage() {
  const {
    walletType,
    freshAccount,
    isFreshAccountAvailable,
    isLoading,
    planResult,
    hasError,
    lockedStx,
    staysBehindNfts,
    isMoving,
    move,
  } = useMoveToFreshAccount();

  const plan = planResult?.kind === 'ready' ? planResult.plan : undefined;
  const stackedStx = lockedStx?.amount.isGreaterThan(0) ? lockedStx : undefined;
  const hasNftTransfers = !!plan?.transfers.some(transfer => transfer.kind === 'nft');

  const calloutLines = [
    walletType === 'ledger' ? ledgerApprovalLine : undefined,
    stackedStx
      ? `${formatCurrency(stackedStx)} is stacked and stays behind until it unlocks.`
      : undefined,
    hasNftTransfers ? nftContractsLine : undefined,
  ].filter(isDefined);

  function renderContent() {
    if (isLoading) return <LoadingSpinner height="200px" />;

    if (!isFreshAccountAvailable)
      return (
        <Callout
          variant="warning"
          title="No fresh account available"
          data-testid={MoveToFreshAccountSelectors.NoFreshAccountWarning}
        >
          The next account has already been used, or this account can't move its assets.
        </Callout>
      );

    if (hasError)
      return <Callout variant="warning" title="Unable to prepare the move. Try again later." />;

    if (planResult?.kind === 'error')
      return <Callout variant="warning" title={planResult.message} />;

    if (!plan) return null;

    return (
      <Stack gap="space.05">
        <MoveSection title="To a fresh address">
          <styled.span
            textStyle="label.02"
            wordBreak="break-all"
            data-testid={MoveToFreshAccountSelectors.FreshAccountAddress}
          >
            {freshAccount?.address}
          </styled.span>
        </MoveSection>
        <MoveSection title="Moves">
          {plan.transfers.map(transfer => {
            const { label, value } = getTransferLabel(transfer);
            return <MoveRow key={transfer.nonce} label={label} value={value} />;
          })}
        </MoveSection>
        {(staysBehindNfts.length > 0 || stackedStx) && (
          <MoveSection title="Stays behind">
            {stackedStx && <MoveRow label={formatCurrency(stackedStx)} value="Stacked" />}
            {staysBehindNfts.map(nft => (
              <MoveRow key={nft.name} label={nft.name} value={nft.reason} />
            ))}
          </MoveSection>
        )}
        <MoveSection title="Summary">
          <MoveRow label="Transactions" value={String(plan.transfers.length)} />
          <MoveRow label="Total fee" value={formatCurrency(plan.totalFee)} />
        </MoveSection>
        {calloutLines.length > 0 && (
          <Callout variant="info">
            {calloutLines.map(line => (
              <styled.span key={line} display="block">
                {line}
              </styled.span>
            ))}
          </Callout>
        )}
      </Stack>
    );
  }

  const footer = (
    <ButtonRow>
      <Button
        disabled={!plan || isMoving}
        aria-busy={isMoving}
        onClick={() => {
          if (plan) void move(plan);
        }}
        data-testid={MoveToFreshAccountSelectors.MoveButton}
      >
        {stacksAssetsLabel}
      </Button>
    </ButtonRow>
  );

  return (
    <Box width="100%" data-testid={MoveToFreshAccountSelectors.MoveToFreshAccountPage}>
      <PageHeader title="Move assets" />
      <Content>
        <Page>
          <Card footer={footer}>
            <Box px="space.05" py="space.05">
              {renderContent()}
            </Box>
          </Card>
        </Page>
      </Content>
    </Box>
  );
}
