import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button, KeyIcon } from '@leather.io/ui';

import {
  type ApprovalKind,
  type ComplianceVerdict,
  type ComplianceWallet,
  complianceCopy,
  dappOrigin,
  getBackupWallets,
  mockApprovals,
  mockMultisig,
  mockSendReview,
} from './compliance-content';
import {
  DetailList,
  DetailRow,
  FooterActions,
  GateFooter,
  LockMark,
  ScreenLayout,
  ScreenTitle,
} from './compliance-screen-parts';

interface LockoutScreenProps {
  onWhy?(): void;
  onDispute?(): void;
}

export function LockoutScreen({ onWhy, onDispute }: LockoutScreenProps) {
  return (
    <ScreenLayout
      footer={
        <Stack gap="space.03" px="space.05" pt="space.04" pb="space.05">
          <Button size="lg" variant="solid" onClick={onWhy}>
            {complianceCopy.lockout.why}
          </Button>
          <Button size="lg" variant="outline" onClick={onDispute}>
            {complianceCopy.lockout.dispute}
          </Button>
        </Stack>
      }
    >
      <Stack flex={1} gap="space.05" justifyContent="center" alignItems="center" textAlign="center">
        <LockMark />
        <ScreenTitle title={complianceCopy.lockout.title} caption={complianceCopy.lockout.body} />
      </Stack>
    </ScreenLayout>
  );
}

interface WhyLockedScreenProps {
  wallets: ComplianceWallet[];
  onBackup?(wallet: ComplianceWallet): void;
  onBack?(): void;
}

export function WhyLockedScreen({ wallets, onBackup, onBack }: WhyLockedScreenProps) {
  const backupWallets = getBackupWallets(wallets);

  return (
    <ScreenLayout
      footer={
        onBack && (
          <FooterActions>
            <Button size="lg" variant="outline" flex={1} onClick={onBack}>
              {complianceCopy.actions.close}
            </Button>
          </FooterActions>
        )
      }
    >
      <ScreenTitle title={complianceCopy.why.title} caption={complianceCopy.why.body} />
      <styled.p textStyle="body.02" color="ink.text-primary">
        {complianceCopy.why.funds}
      </styled.p>
      {backupWallets.length > 0 && (
        <Stack gap="space.02">
          {backupWallets.map(wallet => (
            <styled.button
              key={wallet.id}
              type="button"
              onClick={() => onBackup?.(wallet)}
              display="flex"
              alignItems="center"
              gap="space.02"
              cursor="pointer"
              textStyle="label.02"
              color="ink.text-primary"
              textDecoration="underline"
            >
              <KeyIcon variant="small" />
              {complianceCopy.why.backup(wallet.name)}
            </styled.button>
          ))}
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            {complianceCopy.why.backupNote}
          </styled.p>
        </Stack>
      )}
    </ScreenLayout>
  );
}

interface GatedScreenProps {
  verdict: ComplianceVerdict;
  onConfirm?(): void;
  onCancel?(): void;
  onClose?(): void;
  onRetry?(): void;
  onContactSupport?(): void;
}

export function SendReviewScreen({ verdict, onConfirm, ...handlers }: GatedScreenProps) {
  return (
    <ScreenLayout
      footer={
        <GateFooter
          verdict={verdict}
          primaryLabel="Send"
          refusal={complianceCopy.recipientRefused}
          onPrimary={onConfirm}
          {...handlers}
        />
      }
    >
      <ScreenTitle title="Review" />
      <Stack gap="space.01">
        <styled.span textStyle="heading.03" color="ink.text-primary">
          {mockSendReview.amount}
        </styled.span>
        <styled.span textStyle="label.03" color="ink.text-subdued">
          {mockSendReview.fiat}
        </styled.span>
      </Stack>
      <DetailList>
        <DetailRow label="From" value={mockSendReview.from} />
        <DetailRow label="To" value={mockSendReview.recipient} />
        <DetailRow label="Fee" value={mockSendReview.fee} />
        <DetailRow label="Total" value={mockSendReview.total} />
      </DetailList>
    </ScreenLayout>
  );
}

export function MultisigReviewScreen({ verdict, onConfirm, ...handlers }: GatedScreenProps) {
  return (
    <ScreenLayout
      footer={
        <GateFooter
          verdict={verdict}
          primaryLabel="Propose"
          refusal={complianceCopy.multisigRefused}
          onPrimary={onConfirm}
          {...handlers}
        />
      }
    >
      <ScreenTitle
        title="Review proposal"
        caption={`${mockMultisig.name} · ${mockMultisig.threshold} multisig`}
      />
      <DetailList>
        <DetailRow label="Amount" value={mockMultisig.amount} />
        <DetailRow label="To" value={mockMultisig.recipient} />
      </DetailList>
      <Stack gap="space.02">
        <styled.span textStyle="label.02" color="ink.text-primary">
          Members
        </styled.span>
        {mockMultisig.members.map(member => (
          <styled.span key={member} textStyle="label.03" color="ink.text-subdued">
            {member}
          </styled.span>
        ))}
      </Stack>
    </ScreenLayout>
  );
}

interface ApprovalScreenProps extends GatedScreenProps {
  kind: ApprovalKind;
}

export function ApprovalScreen({ kind, verdict, onConfirm, ...handlers }: ApprovalScreenProps) {
  const approval = mockApprovals[kind];

  return (
    <ScreenLayout
      footer={
        <GateFooter
          verdict={verdict}
          primaryLabel="Approve"
          refusal={complianceCopy.counterpartyRefused}
          onPrimary={onConfirm}
          {...handlers}
        />
      }
    >
      <ScreenTitle title={approval.title} caption={`Requested by ${dappOrigin}`} />
      <Flex>
        <styled.code
          textStyle="caption.02"
          px="space.02"
          py="space.01"
          borderRadius="xs"
          bg="ink.component-background-default"
          color="ink.text-subdued"
        >
          {approval.method}
        </styled.code>
      </Flex>
      <DetailList>
        {approval.rows.map(row => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </DetailList>
    </ScreenLayout>
  );
}
