import { Box, Flex, styled } from 'leather-styles/jsx';

import { Button, CheckmarkCircleIcon, ErrorCircleIcon, Spinner } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-registry';
import { ApprovalFooter } from '../pattern/approval-footer';
import { ApprovalHeader } from '../pattern/approval-header';
import { ApprovalIdentity } from '../pattern/approval-identity';
import { ApprovalLedgerSheet, type LedgerDeviceState } from '../pattern/approval-ledger-sheet';
import { ApprovalNotices, getApprovalNotices } from '../pattern/approval-notices';
import {
  ApprovalContract,
  ApprovalFee,
  ApprovalLimits,
  ApprovalMessage,
  ApprovalMovements,
  ApprovalRow,
  ApprovalRowGroup,
} from '../pattern/approval-rows';
import { ApprovalSigners } from '../pattern/approval-signers';
import {
  type JourneyDefinition,
  type JourneyRequest,
  type JourneyRequester,
  requestNeedsTransaction,
} from './journey-definitions';
import type { JourneyFailure, JourneyStage } from './journey-state';
import {
  type JourneyWalletKind,
  type JourneyWorld,
  formatAssetAmount,
  formatSignedAssetAmount,
  getJourneyAccount,
} from './journey-world';

export function getConfirmLabel(request: JourneyRequest) {
  if (request.kind === 'connect') return 'Connect';
  if (request.vaultStep === 'propose') return 'Propose';
  if (request.vaultStep === 'co-sign') return 'Co-sign';
  if (request.vaultStep === 'broadcast') return 'Broadcast';
  if (request.kind === 'sign-message' || request.mode === 'sign-only') return 'Sign';
  return 'Confirm';
}

function getApprovalEffect(
  request: JourneyRequest,
  requester: JourneyRequester,
  wallet: JourneyWalletKind
) {
  const onDevice = wallet === 'ledger' ? ' after you approve on your Ledger' : '';
  if (request.kind === 'connect') {
    return `${requester.name} will see your Bitcoin and Stacks addresses. It can’t move funds without asking.`;
  }
  if (request.kind === 'sign-message') {
    return `Signing proves you own this account${onDevice}. It doesn’t move funds or cost a fee.`;
  }
  if (request.vaultStep === 'propose' || request.vaultStep === 'co-sign') {
    return `Adds your signature to the vault payment${onDevice}. Nothing is broadcast yet.`;
  }
  if (!requestNeedsTransaction(request)) {
    return `${requester.name} receives a signed transaction${onDevice}. Leather doesn’t broadcast it.`;
  }
  return `Leather broadcasts this transaction${onDevice}. Once confirmed it can’t be undone.`;
}

type JourneyStatusTone = 'progress' | 'success' | 'neutral' | 'error';

type JourneyStatusAction = 'close' | 'retry';

interface JourneyStatus {
  tone: JourneyStatusTone;
  title: string;
  caption: string;
  actions: JourneyStatusAction[];
}

function getSignedStatus(request: JourneyRequest, requester: JourneyRequester): JourneyStatus {
  if (request.vaultStep === 'propose') {
    return {
      tone: 'success',
      title: 'Proposal shared',
      caption: 'Co-signers can now review and sign. Nothing has moved.',
      actions: ['close'],
    };
  }
  if (request.vaultStep === 'co-sign') {
    return {
      tone: 'success',
      title: 'Signature added',
      caption:
        'The payment has enough signatures and is ready to broadcast. Nothing has moved yet.',
      actions: ['close'],
    };
  }
  if (request.kind === 'sign-message') {
    return {
      tone: 'success',
      title: 'Message signed',
      caption: `${requester.name} received your signature. No funds moved.`,
      actions: ['close'],
    };
  }
  return {
    tone: 'success',
    title: 'Signed, not broadcast',
    caption: `${requester.name} received the signed transaction. No transaction exists until it’s broadcast.`,
    actions: ['close'],
  };
}

function getJourneyStatus(
  request: JourneyRequest,
  requester: JourneyRequester,
  stage: JourneyStage,
  failure: JourneyFailure | null
): JourneyStatus | null {
  const fee = request.fee ? formatAssetAmount(request.fee.asset, request.fee.amount) : null;
  switch (stage) {
    case 'broadcasting':
      return {
        tone: 'progress',
        title: 'Broadcasting',
        caption: 'Sending the signed transaction to the network.',
        actions: [],
      };
    case 'pending':
      return {
        tone: 'progress',
        title: 'Submitted',
        caption: 'The network accepted the transaction. It’s pending until a block confirms it.',
        actions: ['close'],
      };
    case 'confirmed':
      return {
        tone: 'success',
        title: 'Confirmed',
        caption: 'The transaction is confirmed. You’ll find it in Activity.',
        actions: ['close'],
      };
    case 'signed':
      return getSignedStatus(request, requester);
    case 'connected':
      return {
        tone: 'success',
        title: `Connected to ${requester.name}`,
        caption: 'You can disconnect from Settings at any time.',
        actions: ['close'],
      };
    case 'cancelled':
      return {
        tone: 'neutral',
        title: 'Request cancelled',
        caption: `Nothing was signed. ${requester.name} was told you declined.`,
        actions: ['close'],
      };
    case 'failed':
      if (failure === 'submitted') {
        return {
          tone: 'error',
          title: 'Failed on the network',
          caption: fee
            ? `The transaction failed after it was submitted. Nothing moved, but the ${fee} network fee was charged.`
            : 'The transaction failed after it was submitted. Nothing moved.',
          actions: ['close'],
        };
      }
      return {
        tone: 'error',
        title: 'Couldn’t broadcast',
        caption: 'The network didn’t accept the transaction. Nothing moved and no fee was charged.',
        actions: ['retry', 'close'],
      };
    default:
      return null;
  }
}

interface StatusIconProps {
  tone: JourneyStatusTone;
}

function StatusIcon({ tone }: StatusIconProps) {
  if (tone === 'progress') return <Spinner />;
  if (tone === 'error') {
    return <ErrorCircleIcon color="red.action-primary-default" />;
  }
  if (tone === 'success') {
    return <CheckmarkCircleIcon color="green.action-primary-default" />;
  }
  return null;
}

interface JourneyStatusViewProps {
  status: JourneyStatus;
  interactive: boolean;
  onClose?(): void;
  onRetry?(): void;
}

function JourneyStatusView({ status, interactive, onClose, onRetry }: JourneyStatusViewProps) {
  return (
    <Flex
      direction="column"
      flex={1}
      justifyContent="center"
      alignItems="center"
      gap="space.04"
      p="space.06"
      textAlign="center"
      data-status={status.tone}
    >
      <StatusIcon tone={status.tone} />
      <Flex direction="column" gap="space.02">
        <styled.h2 textStyle="heading.05" color="ink.text-primary">
          {status.title}
        </styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {status.caption}
        </styled.p>
      </Flex>
      {interactive ? (
        <Flex direction="column" gap="space.02" width="100%">
          {status.actions.includes('retry') ? <Button onClick={onRetry}>Try again</Button> : null}
          {status.actions.includes('close') ? (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  );
}

interface ApprovalExtrasProps {
  direction: ApprovalDirection;
  request: JourneyRequest;
  world: JourneyWorld;
}

function ApprovalExtras({ direction, request, world }: ApprovalExtrasProps) {
  if (direction.extra === 'none' || request.movements.length === 0) return null;
  if (direction.extra === 'activity-preview') {
    const [lead] = request.movements;
    return (
      <ApprovalRowGroup title="In Activity this will read" rowsStyle={direction.rows}>
        <ApprovalRow
          label={request.activityTitle}
          value={lead ? formatSignedAssetAmount(lead) : ''}
        />
      </ApprovalRowGroup>
    );
  }
  const balances = world.balances[request.accountId];
  return (
    <ApprovalRowGroup title="Balance after" rowsStyle={direction.rows}>
      {request.movements.map(movement => (
        <ApprovalRow
          key={movement.asset}
          label={formatAssetAmount(movement.asset, balances[movement.asset])}
          value={`→ ${formatAssetAmount(movement.asset, balances[movement.asset] + movement.amount)}`}
        />
      ))}
    </ApprovalRowGroup>
  );
}

interface ApprovalReviewProps {
  definition: JourneyDefinition;
  request: JourneyRequest;
  world: JourneyWorld;
  direction: ApprovalDirection;
  requestKey: string;
  interactive: boolean;
  animate?: boolean;
  onApprove?(): void;
  onCancel?(): void;
}

function ApprovalReview({
  definition,
  request,
  world,
  direction,
  requestKey,
  interactive,
  animate,
  onApprove,
  onCancel,
}: ApprovalReviewProps) {
  const notices = getApprovalNotices(request, definition.requester);
  const fundsAccount = getJourneyAccount(world, request.accountId);
  const feePayer = getJourneyAccount(world, request.feePayer);

  return (
    <Flex direction="column" flex={1} minHeight={0}>
      <Flex direction="column" gap="space.04" p="space.04" flex={1} overflowY="auto">
        <ApprovalHeader
          direction={direction}
          requester={definition.requester}
          request={request}
          animate={animate}
        />
        <ApprovalIdentity request={request} world={world} />
        {fundsAccount?.kind === 'vault' && request.vaultStep ? (
          <ApprovalSigners vault={fundsAccount} step={request.vaultStep} />
        ) : null}
        <ApprovalMessage request={request} />
        <ApprovalMovements request={request} rowsStyle={direction.rows} />
        <ApprovalLimits request={request} rowsStyle={direction.rows} />
        <ApprovalContract request={request} rowsStyle={direction.rows} />
        <ApprovalExtras direction={direction} request={request} world={world} />
        <ApprovalFee request={request} feePayerName={feePayer?.name ?? 'this account'} />
        <ApprovalNotices notices={notices} />
      </Flex>
      <ApprovalFooter
        effect={getApprovalEffect(request, definition.requester, world.wallet)}
        confirmLabel={getConfirmLabel(request)}
        requestKey={requestKey}
        hold={direction.holdToApprove}
        interactive={interactive}
        onApprove={onApprove}
        onCancel={onCancel}
      />
    </Flex>
  );
}

export interface JourneyWalletViewProps {
  definition: JourneyDefinition;
  request: JourneyRequest;
  stage: JourneyStage;
  failure: JourneyFailure | null;
  world: JourneyWorld;
  direction: ApprovalDirection;
  requestKey: string;
  interactive?: boolean;
  animate?: boolean;
  ledgerState?: LedgerDeviceState;
  onApprove?(): void;
  onCancel?(): void;
  onDeviceApprove?(): void;
  onDeviceReject?(): void;
  onRetry?(): void;
  onClose?(): void;
}

export function JourneyWalletView({
  definition,
  request,
  stage,
  failure,
  world,
  direction,
  requestKey,
  interactive = true,
  animate,
  ledgerState,
  onApprove,
  onCancel,
  onDeviceApprove,
  onDeviceReject,
  onRetry,
  onClose,
}: JourneyWalletViewProps) {
  if (stage === 'idle') return null;

  if (stage === 'reviewing' || stage === 'awaiting-device') {
    const isAwaitingDevice = stage === 'awaiting-device';
    return (
      <Flex direction="column" flex={1} minHeight={0} position="relative" data-stage={stage}>
        <Box
          display="flex"
          flexDirection="column"
          flex={1}
          minHeight={0}
          opacity={isAwaitingDevice ? 0.4 : 1}
          aria-hidden={isAwaitingDevice || undefined}
          inert={isAwaitingDevice || undefined}
        >
          <ApprovalReview
            definition={definition}
            request={request}
            world={world}
            direction={direction}
            requestKey={requestKey}
            interactive={interactive && !isAwaitingDevice}
            animate={animate}
            onApprove={onApprove}
            onCancel={onCancel}
          />
        </Box>
        {isAwaitingDevice ? (
          <Box position="absolute" left={0} right={0} bottom={0}>
            <ApprovalLedgerSheet
              state={ledgerState ?? 'sign'}
              chain={request.chain}
              interactive={interactive}
              onDeviceApprove={onDeviceApprove}
              onDeviceReject={onDeviceReject}
              onCancel={onCancel}
            />
          </Box>
        ) : null}
      </Flex>
    );
  }

  const status = getJourneyStatus(request, definition.requester, stage, failure);
  if (!status) return null;
  return (
    <Flex direction="column" flex={1} data-stage={stage}>
      <JourneyStatusView
        status={status}
        interactive={interactive}
        onClose={onClose}
        onRetry={onRetry}
      />
    </Flex>
  );
}
