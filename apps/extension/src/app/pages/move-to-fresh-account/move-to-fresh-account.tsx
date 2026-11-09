import { MoveToFreshAccountSelectors } from '@tests/selectors/move-to-fresh-account.selectors';
import { Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, LoadingSpinner } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { FormAddressDisplayer } from '@app/components/address-displayer/form-address-displayer';
import { InfoCardRow, InfoCardSeparator } from '@app/components/info-card/info-card';
import { ButtonRow, Card, Content, Page } from '@app/components/layout';
import { PageHeader } from '@app/features/container/headers/page.header';

import { type MoveToFreshAccountState, useMoveToFreshAccount } from './use-move-to-fresh-account';

type ReadyState = Extract<MoveToFreshAccountState, { status: 'ready' }>;

function getCalloutLines({ isLedger, lockedStx, nfts, plan }: ReadyState) {
  const lines: string[] = [];
  if (isLedger) {
    lines.push(
      `Your Ledger asks you to approve each of the ${plan.transactions.length} transactions.`
    );
  }
  if (lockedStx.amount.isGreaterThan(0)) {
    lines.push(`${formatCurrency(lockedStx)} is stacked and stays behind until it unlocks.`);
  }
  if (nfts.length > 0) {
    lines.push(
      'Some NFT contracts block transfers. If one does, its transaction fails and its fee is still spent.'
    );
  }
  return lines;
}

interface MoveToFreshAccountContentProps {
  state: ReadyState;
}

function MoveToFreshAccountContent({ state }: MoveToFreshAccountContentProps) {
  const { freshAddress, plan, tokens, nfts, staysBehind } = state;
  const calloutLines = getCalloutLines(state);

  return (
    <Stack gap="space.03" px="space.05" py="space.05" width="100%">
      <InfoCardRow
        title="Fresh address"
        value={
          <styled.span data-testid={MoveToFreshAccountSelectors.FreshAddress}>
            <FormAddressDisplayer address={freshAddress} />
          </styled.span>
        }
      />
      <InfoCardSeparator />
      <InfoCardRow title="STX" value={formatCurrency(plan.stxAmount)} />
      {tokens.map(token => (
        <InfoCardRow
          key={token.assetId}
          title={token.symbol}
          value={formatCurrency(token.amount)}
        />
      ))}
      {nfts.map(nft => (
        <InfoCardRow key={`${nft.assetIdentifier}-${nft.tokenHex}`} title="NFT" value={nft.name} />
      ))}
      {staysBehind.length > 0 && (
        <>
          <InfoCardSeparator />
          <styled.span textStyle="label.02">Stays behind</styled.span>
          {staysBehind.map(nft => (
            <Stack key={nft.name} gap="space.00">
              <styled.span textStyle="label.02">{nft.name}</styled.span>
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {nft.reason}
              </styled.span>
            </Stack>
          ))}
        </>
      )}
      <InfoCardSeparator />
      <InfoCardRow title="Transactions" value={String(plan.transactions.length)} />
      <InfoCardRow title="Total fee" value={formatCurrency(plan.totalFee)} />
      {calloutLines.length > 0 && (
        <Callout variant="info" mt="space.03">
          <Stack gap="space.01">
            {calloutLines.map(line => (
              <styled.span key={line}>{line}</styled.span>
            ))}
          </Stack>
        </Callout>
      )}
    </Stack>
  );
}

interface MoveToFreshAccountBodyProps {
  state: MoveToFreshAccountState;
}

function MoveToFreshAccountBody({ state }: MoveToFreshAccountBodyProps) {
  switch (state.status) {
    case 'loading':
      return <LoadingSpinner />;
    case 'unavailable':
      return (
        <Callout
          variant="warning"
          title="No fresh account available"
          m="space.05"
          data-testid={MoveToFreshAccountSelectors.NoFreshAccountWarning}
        />
      );
    case 'error':
      return (
        <Callout
          variant="error"
          title={state.message}
          m="space.05"
          data-testid={MoveToFreshAccountSelectors.PlanError}
        />
      );
    case 'ready':
      return <MoveToFreshAccountContent state={state} />;
    default:
      return null;
  }
}

export function MoveToFreshAccountPage() {
  const state = useMoveToFreshAccount();
  const isMoving = state.status === 'ready' && state.moveStatus !== 'idle';

  const footer =
    state.status === 'ready' ? (
      <ButtonRow>
        <Button
          disabled={isMoving}
          aria-busy={isMoving}
          onClick={() => void state.onMove()}
          data-testid={MoveToFreshAccountSelectors.SubmitButton}
        >
          Move Stacks assets
        </Button>
      </ButtonRow>
    ) : undefined;

  return (
    <>
      <PageHeader title="Move assets" />
      <Content>
        <Page>
          <Card footer={footer} dataTestId={MoveToFreshAccountSelectors.MoveToFreshAccountPage}>
            <MoveToFreshAccountBody state={state} />
          </Card>
        </Page>
      </Content>
    </>
  );
}
