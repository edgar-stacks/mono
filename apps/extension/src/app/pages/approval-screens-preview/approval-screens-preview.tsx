import type { ReactNode } from 'react';

import { PostConditionMode } from '@stacks/transactions';
import { ApprovalScreensPreviewSelectors } from '@tests/selectors/requests.selectors';
import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import type { Money } from '@leather.io/models';
import { Approver, Button, Caption, ItemLayout, StxAvatarIcon } from '@leather.io/ui';
import { baseCurrencyAmountInQuote, noop, sumMoney, truncateMiddle } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { ConnectAccountLayout } from '@app/components/connect-account/connect-account.layout';
import { TransactionActionsTitle } from '@app/components/rpc-transaction-request/transaction-actions-title';
import { TransactionHeader } from '@app/components/rpc-transaction-request/transaction-header';
import { TransactionRecipientsLayout } from '@app/components/rpc-transaction-request/transaction-recipients.layout';
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
  previewFee,
  previewLargeAmount,
  previewNonce,
  previewOrigin,
  previewRecipient,
  previewSmallAmount,
  previewStxMarketData,
} from './approval-screens-preview.fixtures';

const popupWidth = 390;
const popupHeight = 756;

function preventNavigation(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
}

function convertStxToFiat(value: Money) {
  return baseCurrencyAmountInQuote(value, previewStxMarketData);
}

function PreviewAccountAvatar() {
  return <AccountAvatarItem index={previewAccount.index} publicKey={previewAccount.publicKey} />;
}

function PreviewSigningAccount() {
  return (
    <AccountApproverSection
      subheader="With account"
      avatar={<PreviewAccountAvatar />}
      name={previewAccount.name}
      caption={<Caption>{truncateMiddle(previewAccount.stxAddress, 4)}</Caption>}
      titleRight={
        <styled.span textStyle="label.02">
          {formatCurrency(previewAccount.stxBalance, { preset: 'pad-decimals' })}
        </styled.span>
      }
      captionRight={
        <Caption>{formatCurrency(convertStxToFiat(previewAccount.stxBalance))}</Caption>
      }
    />
  );
}

interface PreviewActionsProps {
  txAmount: Money;
  approveLabel?: string;
}
function PreviewActions({ txAmount, approveLabel = 'Approve' }: PreviewActionsProps) {
  const totalSpend = convertStxToFiat(sumMoney([txAmount, previewFee.txFee]));
  return (
    <Approver.Actions
      actions={[
        <Button key="cancel" variant="outline" onClick={noop}>
          Cancel
        </Button>,
        <Button key="approve" onClick={noop}>
          {approveLabel}
        </Button>,
      ]}
    >
      <TransactionActionsTitle isLoading={false} amount={formatCurrency(totalSpend)} />
    </Approver.Actions>
  );
}

interface PreviewApproverProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}
function PreviewApprover({ title, children, actions }: PreviewApproverProps) {
  return (
    <Approver requester={previewOrigin} width="100%">
      <TransactionHeader title={title} onPressRequestedByLink={preventNavigation} />
      {children}
      {actions}
    </Approver>
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

interface PreviewStxRecipientProps {
  amount: Money;
}
function PreviewStxRecipient({ amount }: PreviewStxRecipientProps) {
  return (
    <TransactionRecipientsLayout
      title="Stacks"
      caption="Stacks blockchain"
      avatar={<StxAvatarIcon />}
      convertToFiatAmount={convertStxToFiat}
      recipients={[{ address: previewRecipient, amount }]}
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

interface PreviewContractCallProps {
  postConditionMode: PostConditionMode;
}
function PreviewContractCall({ postConditionMode }: PreviewContractCallProps) {
  return (
    <PreviewApprover
      title="Sign contract"
      actions={<PreviewActions txAmount={previewSmallAmount} />}
    >
      <PostConditionsDetailsLayout postConditions={[]} postConditionMode={postConditionMode} />
      <PreviewSigningAccount />
      <ContractCallDetailsLayout {...previewContractCall} />
      <PreviewFeeAndNonce />
    </PreviewApprover>
  );
}

interface PreviewScreen {
  label: string;
  note: string;
  render(): ReactNode;
}

const previewScreens: PreviewScreen[] = [
  {
    label: 'Shared header',
    note: 'Approver header and signing account, shared by every transaction screen.',
    render: () => (
      <PreviewApprover title="Sign transaction">
        <PreviewSigningAccount />
      </PreviewApprover>
    ),
  },
  {
    label: 'Contract call',
    note: 'No post conditions; the arguments load from the contract interface.',
    render: () => <PreviewContractCall postConditionMode={PostConditionMode.Deny} />,
  },
  {
    label: 'Contract call, allow mode',
    note: 'The warning replaces the post-conditions list.',
    render: () => <PreviewContractCall postConditionMode={PostConditionMode.Allow} />,
  },
  {
    label: 'Deploy contract',
    note: 'Full contract source is shown.',
    render: () => (
      <PreviewApprover
        title="Deploy contract"
        actions={<PreviewActions txAmount={previewSmallAmount} />}
      >
        <PostConditionsDetailsLayout postConditions={[]} />
        <PreviewSigningAccount />
        <ContractDeployDetailsLayout
          address={previewAccount.stxAddress}
          contractName={previewContractDeploy.contractName}
          codeBody={previewContractDeploy.codeBody}
        />
        <PreviewFeeAndNonce />
      </PreviewApprover>
    ),
  },
  {
    label: 'Send STX, large amount',
    note: 'Amounts above one million render in compact notation.',
    render: () => (
      <PreviewApprover
        title="Send token"
        actions={<PreviewActions txAmount={previewLargeAmount} />}
      >
        <PreviewSigningAccount />
        <PreviewStxRecipient amount={previewLargeAmount} />
        <PreviewMemo />
        <PreviewFeeAndNonce />
      </PreviewApprover>
    ),
  },
  {
    label: 'Send STX, within balance',
    note: 'Exact amount, memo, fee and nonce.',
    render: () => (
      <PreviewApprover
        title="Send token"
        actions={<PreviewActions txAmount={previewSmallAmount} />}
      >
        <PreviewSigningAccount />
        <PreviewStxRecipient amount={previewSmallAmount} />
        <PreviewMemo />
        <PreviewFeeAndNonce />
      </PreviewApprover>
    ),
  },
  {
    label: 'Multisig co-sign',
    note: 'No fee or nonce row.',
    render: () => (
      <PreviewApprover
        title="Sign transaction"
        actions={<PreviewActions txAmount={previewSmallAmount} />}
      >
        <PreviewSigningAccount />
        <PreviewStxRecipient amount={previewSmallAmount} />
      </PreviewApprover>
    ),
  },
  {
    label: 'Sponsored fee',
    note: 'The fee row becomes a free badge.',
    render: () => (
      <PreviewApprover
        title="Sign transaction"
        actions={<PreviewActions txAmount={previewSmallAmount} />}
      >
        <PreviewSigningAccount />
        <PreviewStxRecipient amount={previewSmallAmount} />
        <PreviewFeeAndNonce isSponsored />
      </PreviewApprover>
    ),
  },
  {
    label: 'Connect app',
    note: 'ConnectAccountLayout, used by getAddresses.',
    render: () => (
      <ConnectAccountLayout
        requester={previewOrigin}
        onClickRequestedByLink={noop}
        onUserApprovesGetAddresses={noop}
        switchAccount={
          <ItemLayout
            img={<PreviewAccountAvatar />}
            titleLeft={previewAccount.name}
            captionLeft={truncateMiddle(previewAccount.stxAddress, 4)}
            titleRight={formatCurrency(convertStxToFiat(previewAccount.stxBalance))}
          />
        }
      />
    ),
  },
  {
    label: 'Legacy message-signing header',
    note: 'The only header that names a network: it adds the API host when the wallet is on testnet.',
    render: () => <MessageSigningHeader origin={previewOrigin} />,
  },
];

interface PreviewFrameProps {
  label: string;
  note: string;
  children: ReactNode;
}
function PreviewFrame({ label, note, children }: PreviewFrameProps) {
  return (
    <Stack gap="space.02" flexShrink={0} style={{ width: popupWidth }}>
      <styled.h2 textStyle="label.01">{label}</styled.h2>
      <styled.p textStyle="caption.01" color="ink.text-subdued">
        {note}
      </styled.p>
      <Box
        border="1px solid"
        borderColor="ink.border-default"
        overflowY="auto"
        bg="ink.background-primary"
        style={{ width: popupWidth, height: popupHeight, transform: 'translateZ(0)' }}
      >
        {children}
      </Box>
    </Stack>
  );
}

export default function ApprovalScreensPreview() {
  return (
    <Stack gap="space.05" p="space.05" width="100vw">
      <styled.h1 textStyle="heading.03" data-testid={ApprovalScreensPreviewSelectors.Heading}>
        Approval screens — live components
      </styled.h1>
      <styled.p textStyle="body.02" color="ink.text-subdued">
        The real approval layout components rendered from fixtures. Development and test builds
        only.
      </styled.p>
      <Flex gap="space.05" overflowX="auto" alignItems="flex-start" pb="space.05">
        {previewScreens.map(screen => (
          <PreviewFrame key={screen.label} label={screen.label} note={screen.note}>
            {screen.render()}
          </PreviewFrame>
        ))}
      </Flex>
    </Stack>
  );
}
