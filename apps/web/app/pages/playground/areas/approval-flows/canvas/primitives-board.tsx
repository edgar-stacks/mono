import { type ReactNode, useState } from 'react';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-registry';
import { HandshakeHeader } from '../directions/handshake/handshake-header';
import { ReferenceHeader } from '../directions/reference-headers';
import { resolveJourney } from '../journeys/journey-definitions';
import { journeyAccounts } from '../journeys/journey-world';
import { ApprovalConfirm } from '../pattern/approval-confirm';
import { AccountIdentity, RequesterIdentity } from '../pattern/approval-identity';
import { ApprovalLedgerSheet, ledgerSheetStates } from '../pattern/approval-ledger-sheet';
import { ApprovalNotices } from '../pattern/approval-notices';
import { DetailRows, FeeRow, LimitRows, MovementRows } from '../pattern/approval-rows';
import { ApprovalQueue, ApprovalSigners } from '../pattern/approval-signers';
import { canvasButton } from './canvas-styles';

interface PrimitiveProps {
  title: string;
  children: ReactNode;
}

function Primitive({ title, children }: PrimitiveProps) {
  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.04"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      bg="ink.background-primary"
      minWidth={0}
    >
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Flex>
  );
}

function ConfirmDemo({ mode }: { mode: 'tap' | 'hold' }) {
  const [requestKey, setRequestKey] = useState(1);
  const [confirmed, setConfirmed] = useState(0);
  return (
    <Flex direction="column" gap="space.02">
      <ApprovalConfirm
        label="Approve"
        mode={mode}
        requestKey={String(requestKey)}
        onConfirm={() => setConfirmed(count => count + 1)}
      />
      <Flex justifyContent="space-between" alignItems="center" gap="space.02">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Confirmed {confirmed} times
        </styled.span>
        <button
          type="button"
          className={canvasButton}
          onClick={() => setRequestKey(key => key + 1)}
        >
          Change request
        </button>
      </Flex>
    </Flex>
  );
}

interface PrimitivesBoardProps {
  direction: ApprovalDirection;
}

export function PrimitivesBoard({ direction }: PrimitivesBoardProps) {
  const [replay, setReplay] = useState(0);
  const send = resolveJourney({ familyId: 'leather-send-swap', variantId: 'swap' }).request;
  const vault = resolveJourney({
    familyId: 'vault-cosign',
    variantId: 'bitcoin',
    wallet: 'ledger',
  }).request;
  const generic = resolveJourney({ familyId: 'generic-mint' }).request;
  const software = journeyAccounts('software');
  const ledger = journeyAccounts('ledger');

  return (
    <Flex direction="column" gap="space.05" px={{ base: 'space.03', md: 'space.06' }} py="space.06">
      <Flex direction="column" gap="space.02" maxWidth="720px">
        <styled.h2 textStyle="heading.04" color="ink.text-primary">
          Primitives
        </styled.h2>
        <styled.p textStyle="body.01" color="ink.text-subdued">
          The shared approval building blocks every screen is made of, shown with the{' '}
          {direction.label} direction.
        </styled.p>
      </Flex>
      <Grid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
        gap="space.04"
      >
        <Primitive title="Header">
          {direction.header === 'handshake' ? (
            <HandshakeHeader key={replay} request={send} animate />
          ) : (
            <ReferenceHeader header={direction.header} request={send} />
          )}
          <Box>
            <button
              type="button"
              className={canvasButton}
              onClick={() => setReplay(count => count + 1)}
            >
              Replay
            </button>
          </Box>
        </Primitive>
        <Primitive title="Identity">
          <RequesterIdentity requester={send.requester} />
          <RequesterIdentity requester={generic.requester} />
          <AccountIdentity account={software.personal} chain="stacks" role="Account" />
          <AccountIdentity account={ledger.personal} chain="bitcoin" role="Account" />
          <AccountIdentity account={vault.account} chain="bitcoin" role="Funds from" />
        </Primitive>
        <Primitive title="Rows">
          <MovementRows movements={send.movements} />
          <MovementRows movements={generic.movements} />
          {send.fee ? <FeeRow fee={send.fee} /> : null}
          <LimitRows limits={send.limits} />
          <DetailRows details={send.details} />
        </Primitive>
        <Primitive title="Notices">
          <ApprovalNotices
            notices={[
              { tone: 'info', title: 'Info', body: 'Context that helps you decide.' },
              ...generic.notices,
              { tone: 'danger', title: 'Danger', body: 'Something will likely go wrong.' },
            ]}
          />
        </Primitive>
        <Primitive title="Signers and queue">
          <ApprovalSigners signers={vault.signers} />
          <ApprovalQueue position={2} total={3} />
        </Primitive>
        <Primitive title="Confirm">
          <ConfirmDemo mode="tap" />
          <ConfirmDemo mode="hold" />
        </Primitive>
      </Grid>
      <styled.h3 textStyle="heading.05" color="ink.text-primary">
        Ledger sheet
      </styled.h3>
      <Grid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }}
        gap="space.04"
      >
        {ledgerSheetStates.map(state => (
          <Box
            key={state}
            borderRadius="md"
            overflow="hidden"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="ink.border-default"
          >
            <ApprovalLedgerSheet state={state} chain="stacks" preview />
          </Box>
        ))}
      </Grid>
    </Flex>
  );
}
