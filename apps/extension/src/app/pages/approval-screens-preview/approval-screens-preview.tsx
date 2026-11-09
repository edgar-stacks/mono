import type { ReactNode } from 'react';

import { ApprovalScreensPreviewSelectors } from '@tests/selectors/requests.selectors';
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

import type { TransferRecipient } from '@shared/models/form.model';

import { formatCurrency } from '@app/common/currency-formatter';
import { ConnectAccountLayout } from '@app/components/connect-account/connect-account.layout';
import { getTransactionActions } from '@app/components/rpc-transaction-request/get-transaction-actions';
import { TransactionActionsTitle } from '@app/components/rpc-transaction-request/transaction-actions-title';
import { TransactionHeader } from '@app/components/rpc-transaction-request/transaction-header';
import { TransactionRecipientsLayout } from '@app/components/rpc-transaction-request/transaction-recipients.layout';
import { TransactionWrapper } from '@app/components/rpc-transaction-request/transaction-wrapper';
import { SelectedFeeItem } from '@app/features/fee-editor/components/selected-fee-item';
import { MessageSigningHeader } from '@app/features/message-signer/message-signing-header';
import { NonceItem } from '@app/features/nonce-editor/nonce-item';
import { AccountApproverSection } from '@app/features/rpc-stacks-transaction-request/signing-account-card/signing-account-card';
import { ContractCallDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/contract-call/contract-call-details.layout';
import { ContractDeployDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/contract-deploy/contract-deploy-details.layout';
import { PostConditionsDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/post-conditions/post-conditions-details.layout';
import { AccountAvatarItem } from '@app/ui/components/account/account-avatar/account-avatar-item';

import {
  previewAccount,
  previewContractCall,
  previewContractDeploy,
  previewFrameHeight,
  previewFrameWidth,
  previewLargeTransfer,
  previewMemo,
  previewMultisigTransfer,
  previewNonce,
  previewOrigin,
  previewSmallTransfer,
  previewStandardFee,
  previewStxMarketData,
} from './approval-screens-preview.fixtures';

function convertStxToFiat(value: Money) {
  return baseCurrencyAmountInQuote(value, previewStxMarketData);
}

interface PreviewFrameProps {
  label: string;
  children: ReactNode;
}
function PreviewFrame({ label, children }: PreviewFrameProps) {
  return (
    <Stack gap="space.02">
      <styled.span textStyle="label.02">{label}</styled.span>
      <Box
        style={{ width: previewFrameWidth, height: previewFrameHeight }}
        overflow="hidden"
        position="relative"
        transform="translateZ(0)"
        border="1px solid"
        borderColor="ink.border-default"
      >
        <Box height="100%" overflowY="auto">
          {children}
        </Box>
      </Box>
    </Stack>
  );
}

function PreviewAccountSection() {
  return (
    <AccountApproverSection
      subheader="With account"
      avatar={
        <AccountAvatarItem index={previewAccount.index} publicKey={previewAccount.publicKey} />
      }
      name={previewAccount.name}
      caption={<Caption>{truncateMiddle(previewAccount.address, 4)}</Caption>}
      titleRight={
        <styled.span textStyle="label.02">
          {formatCurrency(previewAccount.availableBalance, { preset: 'pad-decimals' })}
        </styled.span>
      }
      captionRight={
        <Caption>{formatCurrency(convertStxToFiat(previewAccount.availableBalance))}</Caption>
      }
    />
  );
}

interface PreviewActionsProps {
  totalSpend: Money;
}
function PreviewActions({ totalSpend }: PreviewActionsProps) {
  return (
    <Approver.Actions
      actions={getTransactionActions({
        isLoading: false,
        isError: false,
        isBroadcasting: false,
        isSubmitted: false,
        onCancel: noop,
        onApprove: noop,
      })}
    >
      <TransactionActionsTitle isLoading={false} amount={formatCurrency(totalSpend)} />
    </Approver.Actions>
  );
}

interface PreviewTransactionProps {
  title: string;
  totalSpend?: Money;
  children?: ReactNode;
}
function PreviewTransaction({
  title,
  totalSpend = previewStandardFee.txFee,
  children,
}: PreviewTransactionProps) {
  return (
    <TransactionWrapper>
      <Approver requester={previewOrigin} width="100%">
        <Box position="relative">
          <TransactionHeader title={title} onPressRequestedByLink={noop} />
          {children}
        </Box>
        <PreviewActions totalSpend={totalSpend} />
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
        selectedFee={previewStandardFee}
      />
      <NonceItem nonce={previewNonce} onEditNonce={noop} />
    </>
  );
}

function PreviewContractCall() {
  return (
    <ContractCallDetailsLayout
      contractAddress={previewContractCall.contractAddress}
      contractName={previewContractCall.contractName}
      functionName={previewContractCall.functionName}
      functionArgs={previewContractCall.functionArgs}
    />
  );
}

interface PreviewTransferProps {
  recipients: TransferRecipient[];
}
function PreviewTransfer({ recipients }: PreviewTransferProps) {
  return (
    <PreviewTransaction
      title="Send token"
      totalSpend={sumMoney([...recipients.map(({ amount }) => amount), previewStandardFee.txFee])}
    >
      <PreviewAccountSection />
      <TransactionRecipientsLayout
        title="Stacks"
        caption="Stacks blockchain"
        avatar={<StxAvatarIcon />}
        convertToFiatAmount={convertStxToFiat}
        recipients={recipients}
      />
      <Approver.Section>
        <Approver.Subheader>Memo</Approver.Subheader>
        <styled.span textStyle="label.01" wordBreak="break-all">
          {previewMemo}
        </styled.span>
      </Approver.Section>
      <PreviewFeeAndNonce />
    </PreviewTransaction>
  );
}

// ts-unused-exports:disable-next-line
export function ApprovalScreensPreview() {
  return (
    <Stack gap="space.05" p="space.05" bg="ink.background-primary" minHeight="100vh">
      <styled.h1 textStyle="heading.03" data-testid={ApprovalScreensPreviewSelectors.Heading}>
        Approval screens — live components
      </styled.h1>
      <styled.p textStyle="body.02" color="ink.text-subdued">
        Real layout components rendered with fixture props. Development and test builds only.
      </styled.p>
      <Flex gap="space.05" flexWrap="wrap" alignItems="flex-start">
        <PreviewFrame label="Shared header">
          <PreviewTransaction title="Sign transaction" />
        </PreviewFrame>
        <PreviewFrame label="Contract call">
          <PreviewTransaction title="Sign contract">
            <PostConditionsDetailsLayout postConditions={[]} />
            <PreviewAccountSection />
            <PreviewContractCall />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>
        <PreviewFrame label="Contract call, allow mode">
          <PreviewTransaction title="Sign contract">
            <PostConditionsDetailsLayout postConditions={[]} postConditionMode="allow" />
            <PreviewAccountSection />
            <PreviewContractCall />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>
        <PreviewFrame label="Contract deploy">
          <PreviewTransaction title="Deploy contract">
            <PostConditionsDetailsLayout postConditions={[]} />
            <PreviewAccountSection />
            <ContractDeployDetailsLayout
              address={previewContractDeploy.address}
              contractName={previewContractDeploy.contractName}
              codeBody={previewContractDeploy.codeBody}
            />
            <PreviewFeeAndNonce />
          </PreviewTransaction>
        </PreviewFrame>
        <PreviewFrame label="STX transfer">
          <PreviewTransfer recipients={previewSmallTransfer} />
        </PreviewFrame>
        <PreviewFrame label="STX transfer, large amount">
          <PreviewTransfer recipients={previewLargeTransfer} />
        </PreviewFrame>
        <PreviewFrame label="Multisig co-sign">
          <PreviewTransaction title="Sign transaction" totalSpend={createMoney(0, 'STX')}>
            <PreviewAccountSection />
            <TransactionRecipientsLayout
              title="Stacks"
              caption="Stacks blockchain"
              avatar={<StxAvatarIcon />}
              convertToFiatAmount={convertStxToFiat}
              recipients={previewMultisigTransfer}
            />
          </PreviewTransaction>
        </PreviewFrame>
        <PreviewFrame label="Sponsored fee">
          <PreviewTransaction title="Sign contract" totalSpend={createMoney(0, 'STX')}>
            <PostConditionsDetailsLayout postConditions={[]} />
            <PreviewAccountSection />
            <PreviewContractCall />
            <PreviewFeeAndNonce isSponsored />
          </PreviewTransaction>
        </PreviewFrame>
        <PreviewFrame label="Connect app">
          <ConnectAccountLayout
            requester={previewOrigin}
            onClickRequestedByLink={noop}
            onUserApprovesGetAddresses={noop}
            switchAccount={
              <ItemLayout
                img={
                  <AccountAvatarItem
                    index={previewAccount.index}
                    publicKey={previewAccount.publicKey}
                  />
                }
                titleLeft={previewAccount.name}
                captionLeft={truncateMiddle(previewAccount.address, 4)}
              />
            }
          />
        </PreviewFrame>
        <PreviewFrame label="Legacy message-signing header">
          <Box px="space.05" bg="ink.background-primary">
            <MessageSigningHeader origin={previewOrigin} />
          </Box>
        </PreviewFrame>
      </Flex>
    </Stack>
  );
}
