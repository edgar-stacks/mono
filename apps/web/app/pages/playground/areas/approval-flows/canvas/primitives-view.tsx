import { type ReactNode, useState } from 'react';

import { Flex, Grid, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { ApprovalConfirm } from '../pattern/approval-confirm';
import { RequesterIdentity, SignerIdentity, VaultIdentity } from '../pattern/approval-identity';
import { HandshakeAnimation, LeatherLaunchAnimation } from '../pattern/approval-launch-animations';
import { ApprovalLedgerAnimation } from '../pattern/approval-ledger-animation';
import { ApprovalLedgerDevice } from '../pattern/approval-ledger-device';
import { ApprovalLedgerSheet, ledgerSheetPhases } from '../pattern/approval-ledger-sheet';
import { ApprovalNotices } from '../pattern/approval-notices';
import { ApprovalQueue } from '../pattern/approval-queue';
import {
  ContractCallBlock,
  FeeRow,
  LimitsBlock,
  MessageBlock,
  MovementRow,
  NoMovementRow,
  SharesBlock,
  UnknownMovementRow,
} from '../pattern/approval-rows';
import { ApprovalSigners } from '../pattern/approval-signers';
import { connectRequest } from '../scenarios/connect-scenarios';
import {
  contractMintRequest,
  contractUnlimitedRequest,
} from '../scenarios/contract-call-scenarios';
import { leatherSwapRequest } from '../scenarios/leather-scenarios';
import { messageRequest } from '../scenarios/message-scenarios';
import { requesters } from '../scenarios/scenario-fixtures';
import { vaultRequest } from '../scenarios/vault-scenarios';
import { useCanvasSettings } from './canvas-settings';

function noop() {
  return;
}

function PrimitiveCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.04"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-transparent"
      bg="ink.background-primary"
      minWidth="0"
    >
      <styled.h3 textStyle="label.03" color="ink.text-subdued">
        {title}
      </styled.h3>
      {children}
    </Flex>
  );
}

function PrimitiveGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex direction="column" gap="space.03">
      <styled.h2 textStyle="heading.05" color="ink.text-primary">
        {title}
      </styled.h2>
      <Grid
        gridTemplateColumns={{
          base: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
          xl: 'repeat(3, minmax(0, 1fr))',
        }}
        gap="space.04"
      >
        {children}
      </Grid>
    </Flex>
  );
}

function ConfirmDemo({ mode }: { mode: 'press' | 'hold' }) {
  const [round, setRound] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  return (
    <Flex direction="column" gap="space.02">
      <Flex>
        <ApprovalConfirm
          label="Approve"
          reviewKey={String(round)}
          mode={mode}
          onConfirm={() => setConfirmed(value => value + 1)}
        />
      </Flex>
      <Flex justifyContent="space-between" alignItems="center">
        <styled.span role="status" textStyle="caption.01" color="ink.text-subdued">
          Confirmed {confirmed} {confirmed === 1 ? 'time' : 'times'}
        </styled.span>
        <Button variant="ghost" size="sm" onClick={() => setRound(value => value + 1)}>
          New request
        </Button>
      </Flex>
    </Flex>
  );
}

function ReplayCard({
  title,
  children,
}: {
  title: string;
  children(replayKey: string): ReactNode;
}) {
  const [replay, setReplay] = useState(0);
  return (
    <PrimitiveCard title={title}>
      <Flex minHeight="72px" alignItems="center" justifyContent="center">
        {children(String(replay))}
      </Flex>
      <Button variant="ghost" size="sm" onClick={() => setReplay(value => value + 1)}>
        Replay
      </Button>
    </PrimitiveCard>
  );
}

export function PrimitivesView() {
  const { direction } = useCanvasSettings();
  const swap = leatherSwapRequest('software');
  const coSign = vaultRequest('ledger', 'stacks', 'co-sign');
  const mint = contractMintRequest('software');
  const unlimited = contractUnlimitedRequest('software');
  const structured = messageRequest('software', 'structured');
  const connect = connectRequest('software', { firstVisit: true });
  const { Header } = direction;

  return (
    <Flex
      direction="column"
      gap="space.07"
      px={{ base: 'space.03', md: 'space.06' }}
      py="space.05"
      pb="120px"
    >
      <PrimitiveGroup title={`Header · ${direction.label}`}>
        <PrimitiveCard title="Connect">
          <Header request={connect} interactive replayKey="primitives" />
        </PrimitiveCard>
        <PrimitiveCard title="Transaction">
          <Header request={swap} interactive replayKey="primitives" />
        </PrimitiveCard>
      </PrimitiveGroup>
      <PrimitiveGroup title="Identity">
        <PrimitiveCard title="Requester, first visit">
          <RequesterIdentity requester={{ ...requesters.bitflow, firstVisit: true }} />
        </PrimitiveCard>
        <PrimitiveCard title="Requester, returning">
          <RequesterIdentity requester={requesters.zest} />
        </PrimitiveCard>
        <PrimitiveCard title="Software signer">
          <SignerIdentity signer={swap.signer} />
        </PrimitiveCard>
        <PrimitiveCard title="Ledger signer for a vault">
          {coSign.vault ? <VaultIdentity vault={coSign.vault} /> : null}
          <SignerIdentity signer={coSign.signer} label="Your signature from" />
        </PrimitiveCard>
      </PrimitiveGroup>
      <PrimitiveGroup title="Rows">
        <PrimitiveCard title="Movements and fee">
          {swap.movements.map(movement => (
            <MovementRow key={movement.direction} movement={movement} />
          ))}
          {swap.fee ? <FeeRow fee={swap.fee} /> : null}
        </PrimitiveCard>
        <PrimitiveCard title="Enforced limits">
          {mint.limits ? <LimitsBlock limits={mint.limits} /> : null}
        </PrimitiveCard>
        <PrimitiveCard title="No limits">
          <UnknownMovementRow />
          {unlimited.limits ? <LimitsBlock limits={unlimited.limits} /> : null}
        </PrimitiveCard>
        <PrimitiveCard title="Nothing moves">
          <NoMovementRow />
        </PrimitiveCard>
        <PrimitiveCard title="Contract call">
          {mint.contractCall ? <ContractCallBlock call={mint.contractCall} /> : null}
        </PrimitiveCard>
        <PrimitiveCard title="Structured message">
          {structured.message ? <MessageBlock message={structured.message} /> : null}
        </PrimitiveCard>
        <PrimitiveCard title="Shared with the app">
          {connect.shares ? <SharesBlock shares={connect.shares} /> : null}
        </PrimitiveCard>
      </PrimitiveGroup>
      <PrimitiveGroup title="Notices, queue and signers">
        <PrimitiveCard title="Notices">
          <ApprovalNotices
            notices={[
              { tone: 'info', text: 'Quote refreshed 12 seconds ago.' },
              { tone: 'warning', text: 'Structured messages can authorize actions in the app.' },
              { tone: 'danger', text: 'This call sets no spending limits.' },
            ]}
          />
        </PrimitiveCard>
        <PrimitiveCard title="Queue">
          <ApprovalQueue position={1} total={3} />
        </PrimitiveCard>
        <PrimitiveCard title="Vault signatures">
          {coSign.vault ? <ApprovalSigners vault={coSign.vault} /> : null}
        </PrimitiveCard>
      </PrimitiveGroup>
      <PrimitiveGroup title="Confirm">
        <PrimitiveCard title="Press, after a minimum review time">
          <ConfirmDemo mode="press" />
        </PrimitiveCard>
        <PrimitiveCard title="Hold to approve">
          <ConfirmDemo mode="hold" />
        </PrimitiveCard>
      </PrimitiveGroup>
      <PrimitiveGroup title="Launch">
        <ReplayCard title="Handshake, for connect">
          {replayKey => <HandshakeAnimation requester={requesters.bitflow} replayKey={replayKey} />}
        </ReplayCard>
        <ReplayCard title="Drawn Leather logo, for other approvals">
          {replayKey => <LeatherLaunchAnimation replayKey={replayKey} />}
        </ReplayCard>
        <PrimitiveCard title="Noninteractive preview">
          <HandshakeAnimation requester={requesters.bitflow} interactive={false} />
        </PrimitiveCard>
      </PrimitiveGroup>
      <PrimitiveGroup title="Ledger">
        <PrimitiveCard title="Device">
          <ApprovalLedgerDevice
            lines={['Review transaction', 'Send 0.0125 BTC', 'Fee 0.0000282 BTC']}
          />
        </PrimitiveCard>
        <PrimitiveCard title="Cable animation">
          <ApprovalLedgerAnimation />
        </PrimitiveCard>
        {ledgerSheetPhases
          .filter(phase => phase !== 'connect')
          .map(phase => (
            <PrimitiveCard key={phase} title={`Sheet · ${phase}`}>
              <ApprovalLedgerSheet
                phase={phase}
                chain="stacks"
                deviceLines={['Review transaction', 'Supply 0.02 sBTC']}
                onConnect={noop}
                onApprove={noop}
                onReject={noop}
                onDisconnect={noop}
                onCancel={noop}
              />
            </PrimitiveCard>
          ))}
      </PrimitiveGroup>
    </Flex>
  );
}
