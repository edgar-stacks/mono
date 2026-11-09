import type { ReactNode } from 'react';

import { ApprovalScreensPreviewSelectors } from '@tests/selectors/approval-screens-preview.selectors';
import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import type { Money } from '@leather.io/models';
import { Approver, Caption, ItemLayout, StxAvatarIcon } from '@leather.io/ui';
import {
  baseCurrencyAmountInQuote,
  createMoney,
  noop,
  sumMoney,
  truncateMiddle,
} from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { ConnectAccountLayout } from '@app/components/connect-account/connect-account.layout';
import { getTransactionActions } from '@app/components/rpc-transaction-request/get-transaction-actions';
import { TransactionActionsTitle } from '@app/components/rpc-transaction-request/transaction-actions-title';
import { TransactionError } from '@app/components/rpc-transaction-request/transaction-error';
import { TransactionHeader } from '@app/components/rpc-transaction-request/transaction-header';
import { TransactionRecipientsLayout } from '@app/components/rpc-transaction-request/transaction-recipients.layout';
import { TransactionWrapper } from '@app/components/rpc-transaction-request/transaction-wrapper';
import { SelectedFeeItem } from '@app/features/fee-editor/components/selected-fee-item';
import { MessagePreviewBox } from '@app/features/message-signer/message-preview-box';
import { MessageSigningHeader } from '@app/features/message-signer/message-signing-header';
import { MessageSigningRequestLayout } from '@app/features/message-signer/message-signing-request.layout';
import { NonceItem } from '@app/features/nonce-editor/nonce-item';
import { AccountApproverSection } from '@app/features/rpc-stacks-transaction-request/signing-account-card/signing-account-card';
import { ContractCallDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/contract-call/contract-call-details.layout';
import { ContractDeployDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/contract-deploy/contract-deploy-details.layout';
import { PostConditionsDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/post-conditions/post-conditions-details.layout';
import { AccountAvatarItem } from '@app/ui/components/account/account-avatar/account-avatar-item';

import {
  previewAvailableBalance,
  previewContractCall,
  previewContractDeploy,
  previewFee,
  previewFrameHeight,
  previewFrameWidth,
  previewLargeTransfer,
  previewNonce,
  previewRequester,
  previewSigner,
  previewSmallTransfer,
  previewStxMarketData,
} from './approval-screens-preview.fixtures';

const noSpend = createMoney(0, 'STX');

function toFiat(value: Money) {
  return baseCurrencyAmountInQuote(value, previewStxMarketData);
}

interface PreviewFrameProps {
  label: string;
  note: string;
  children: ReactNode;
}
function PreviewFrame({ label, note, children }: PreviewFrameProps) {
  return (
    <Stack gap="space.02" flexShrink={0} style={{ width: previewFrameWidth }}>
      <styled.h2 textStyle="label.01">{label}</styled.h2>
      <styled.p textStyle="caption.01" color="ink.text-subdued" minHeight="48px">
        {note}
      </styled.p>
      <Box
        style={{ width: previewFrameWidth, height: previewFrameHeight }}
        overflowY="auto"
        transform="translateZ(0)"
        borderWidth={1}
        borderColor="ink.border-default"
        borderRadius="md"
      >
        <Box pointerEvents="none">{children}</Box>
      </Box>
    </Stack>
  );
}

function PreviewSigner() {
  return (
    <AccountApproverSection
      subheader="With account"
      avatar={<AccountAvatarItem index={previewSigner.index} publicKey={previewSigner.publicKey} />}
      name={previewSigner.name}
      caption={<Caption>{truncateMiddle(previewSigner.address, 4)}</Caption>}
      titleRight={
        <styled.span textStyle="label.02">
          {formatCurrency(previewAvailableBalance, { preset: 'pad-decimals' })}
        </styled.span>
      }
      captionRight={<Caption>{formatCurrency(toFiat(previewAvailableBalance))}</Caption>}
    />
  );
}

interface PreviewTransactionProps {
  title: string;
  txAmount: Money;
  isSponsored?: boolean;
  children?: ReactNode;
}
function PreviewTransaction({
  title,
  txAmount,
  isSponsored = false,
  children,
}: PreviewTransactionProps) {
  const totalSpend = baseCurrencyAmountInQuote(
    sumMoney([txAmount, previewFee.txFee]),
    previewStxMarketData
  );
  const isInsufficientBalance =
    !isSponsored && previewAvailableBalance.amount.isLessThan(totalSpend.amount);

  return (
    <TransactionWrapper>
      <Approver requester={previewRequester} width="100%">
        <TransactionHeader title={title} onPressRequestedByLink={e => e.preventDefault()} />
        {children}
        <Approver.Actions
          actions={getTransactionActions({
            isLoading: false,
            isBroadcasting: false,
            isSubmitted: false,
            isError: isInsufficientBalance,
            onCancel: noop,
            onApprove: noop,
          })}
        >
          <TransactionActionsTitle isLoading={false} amount={formatCurrency(totalSpend)} />
          <TransactionError isInsufficientBalance={isInsufficientBalance} isLoading={false} />
        </Approver.Actions>
      </Approver>
    </TransactionWrapper>
  );
}

interface PreviewFeeAndNonceProps {
  isSponsored?: boolean;
}
function PreviewFeeAndNonce({ isSponsored = false }: PreviewFeeAndNonceProps) {
  return (
    <>
      <SelectedFeeItem
        feeType="fee-value"
        isLoading={false}
        isSponsored={isSponsored}
        marketData={previewStxMarketData}
        onEditFee={noop}
        selectedFee={previewFee}
      />
      <NonceItem nonce={previewNonce} onEditNonce={noop} />
    </>
  );
}

interface PreviewRecipientsProps {
  recipients: typeof previewSmallTransfer;
}
function PreviewRecipients({ recipients }: PreviewRecipientsProps) {
  return (
    <TransactionRecipientsLayout
      title="Stacks"
      caption="Stacks blockchain"
      avatar={<StxAvatarIcon />}
      convertToFiatAmount={toFiat}
      recipients={recipients}
    />
  );
}

function PreviewMemo() {
  return (
    <Approver.Section>
      <Approver.Subheader>Memo</Approver.Subheader>
      <styled.span textStyle="label.01" wordBreak="break-all">
        No memo
      </styled.span>
    </Approver.Section>
  );
}

export default function ApprovalScreensPreview() {
  return (
    <Stack gap="space.06" p="space.05" width="100%" bg="ink.background-primary">
      <Stack gap="space.02" maxWidth="70ch">
        <styled.h1 data-testid={ApprovalScreensPreviewSelectors.Heading} textStyle="heading.03">
          Approval screens — live components
        </styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          The real approval layout components rendered with hand-written props, one 390×756 frame
          per screen. Nothing here goes through a request container, so it can drift from what
          ships: use the screenshot spec for that.
        </styled.p>
      </Stack>
      <Flex gap="space.06" overflowX="auto" pb="space.05" alignItems="flex-start">
        <PreviewFrame
          label="Shared header"
          note="Approver header alone: the caption shows the hostname without its port."
        >
          <PreviewTransaction title="Sign transaction" txAmount={noSpend} />
        </PreviewFrame>

        <PreviewFrame
          label="Contract call"
          note="stx_callContract with no post conditions, so the title reads Sign contract."
        >
          <PreviewTransaction title="Sign contract" txAmount={noSpend}>
            <PostConditionsDetailsLayout postConditions={[]} postConditionMode="deny" />
            <PreviewSigner />
            <ContractCallDetailsLayout {...previewContractCall} />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Contract call, allow mode"
          note="In allow mode the warning replaces the post-conditions list."
        >
          <PreviewTransaction title="Sign contract" txAmount={noSpend}>
            <PostConditionsDetailsLayout postConditions={[]} postConditionMode="allow" />
            <PreviewSigner />
            <ContractCallDetailsLayout {...previewContractCall} />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Deploy contract"
          note="stx_deployContract shows the full Clarity code."
        >
          <PreviewTransaction title="Deploy contract" txAmount={noSpend}>
            <PostConditionsDetailsLayout postConditions={[]} />
            <PreviewSigner />
            <ContractDeployDetailsLayout {...previewContractDeploy} />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Transfer within balance"
          note="stx_transferStx for 0.0001 STX: amount, recipient, memo, fee and nonce."
        >
          <PreviewTransaction title="Send token" txAmount={previewSmallTransfer[0].amount}>
            <PreviewSigner />
            <PreviewRecipients recipients={previewSmallTransfer} />
            <PreviewMemo />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Transfer, large amount"
          note="Amounts above one million render in compact notation (1.23M STX)."
        >
          <PreviewTransaction title="Send token" txAmount={previewLargeTransfer[0].amount}>
            <PreviewSigner />
            <PreviewRecipients recipients={previewLargeTransfer} />
            <PreviewMemo />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Multisig co-sign"
          note="stx_signTransaction with a multisig spending condition shows no fee or nonce row."
        >
          <PreviewTransaction title="Sign transaction" txAmount={noSpend}>
            <PreviewSigner />
            <PreviewRecipients recipients={previewSmallTransfer} />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Sponsored fee"
          note="A sponsored request swaps the fee row for a FREE badge; the nonce row stays."
        >
          <PreviewTransaction
            title="Send token"
            txAmount={previewSmallTransfer[0].amount}
            isSponsored
          >
            <PreviewSigner />
            <PreviewRecipients recipients={previewSmallTransfer} />
            <PreviewFeeAndNonce isSponsored />
          </PreviewTransaction>
        </PreviewFrame>

        <PreviewFrame
          label="Connect app"
          note="getAddresses: the account and what the app may do, with no network shown."
        >
          <ConnectAccountLayout
            requester={previewRequester}
            switchAccount={
              <ItemLayout
                img={
                  <AccountAvatarItem
                    index={previewSigner.index}
                    publicKey={previewSigner.publicKey}
                  />
                }
                titleLeft={previewSigner.name}
                captionLeft={truncateMiddle(previewSigner.address, 4)}
              />
            }
            onUserApprovesGetAddresses={noop}
            onClickRequestedByLink={noop}
          />
        </PreviewFrame>

        <PreviewFrame
          label="Legacy message-signing header"
          note="Used by signMessage and stx_signMessage; the only header that states the network, by naming the node host on testnet."
        >
          <MessageSigningRequestLayout>
            <MessageSigningHeader origin={previewRequester} />
            <MessagePreviewBox message="Sign in to Leather preview" />
          </MessageSigningRequestLayout>
        </PreviewFrame>
      </Flex>
    </Stack>
  );
}
