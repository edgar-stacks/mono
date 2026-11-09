import { type ReactNode, useState } from 'react';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';

import { type ApprovalDirection, approvalDirections } from '../directions/direction-registry';
import { resolveJourney } from '../journeys/journey-definitions';
import { deriveJourneyWorld, getJourneyAccount } from '../journeys/journey-world';
import { ApprovalConfirm } from '../pattern/approval-confirm';
import { ApprovalHeader } from '../pattern/approval-header';
import { ApprovalIdentity } from '../pattern/approval-identity';
import { ApprovalLedgerSheet, ledgerDeviceStates } from '../pattern/approval-ledger-sheet';
import { ApprovalNotices, getApprovalNotices } from '../pattern/approval-notices';
import {
  ApprovalContract,
  ApprovalFee,
  ApprovalLimits,
  ApprovalMessage,
  ApprovalMovements,
} from '../pattern/approval-rows';
import { ApprovalSigners } from '../pattern/approval-signers';

interface PrimitiveProps {
  title: string;
  children: ReactNode;
}

function Primitive({ title, children }: PrimitiveProps) {
  return (
    <Flex direction="column" gap="space.03">
      <styled.h3 textStyle="label.02" color="ink.text-subdued">
        {title}
      </styled.h3>
      <Box
        p="space.04"
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
        width="100%"
        maxWidth="360px"
      >
        {children}
      </Box>
    </Flex>
  );
}

interface PrimitiveSectionProps {
  title: string;
  children: ReactNode;
}

function PrimitiveSection({ title, children }: PrimitiveSectionProps) {
  return (
    <Flex as="section" direction="column" gap="space.04">
      <styled.h2 textStyle="heading.04" color="ink.text-primary">
        {title}
      </styled.h2>
      <Grid gridTemplateColumns="repeat(auto-fill, minmax(min(100%, 320px), 1fr))" gap="space.05">
        {children}
      </Grid>
    </Flex>
  );
}

interface ConfirmDemoProps {
  hold: boolean;
}

function ConfirmDemo({ hold }: ConfirmDemoProps) {
  const [confirmations, setConfirmations] = useState(0);
  const [requestKey, setRequestKey] = useState(1);
  return (
    <Flex direction="column" gap="space.02">
      <ApprovalConfirm
        label="Confirm"
        requestKey={String(requestKey)}
        hold={hold}
        onConfirm={() => setConfirmations(count => count + 1)}
      />
      <Flex justifyContent="space-between" alignItems="center">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Fired {confirmations} {confirmations === 1 ? 'time' : 'times'}
        </styled.span>
        <styled.button
          type="button"
          textStyle="caption.01"
          color="ink.text-primary"
          textDecoration="underline"
          onClick={() => setRequestKey(key => key + 1)}
        >
          New request
        </styled.button>
      </Flex>
    </Flex>
  );
}

interface ApprovalPrimitivesProps {
  direction: ApprovalDirection;
}

export function ApprovalPrimitives({ direction }: ApprovalPrimitivesProps) {
  const software = deriveJourneyWorld('software', []);
  const ledger = deriveJourneyWorld('ledger', []);
  const connect = resolveJourney('connect', 'first');
  const swap = resolveJourney('leather-swap', 'stx-sbtc');
  const vault = resolveJourney('vault', 'bitcoin-co-sign');
  const generic = resolveJourney('contract-call-unlimited', 'none');
  const message = resolveJourney('sign-message', 'structured');
  const bitcoinVault = getJourneyAccount(software, 'bitcoin-vault');
  const visibleDirections = approvalDirections.filter(
    candidate => !candidate.isDiscarded || candidate.id === direction.id
  );

  return (
    <Flex direction="column" gap="space.07" px={{ base: 'space.04', md: 'space.06' }} py="space.06">
      <PrimitiveSection title="Headers">
        {visibleDirections.map(candidate => (
          <Primitive key={candidate.id} title={candidate.label}>
            <ApprovalHeader
              direction={candidate}
              requester={swap.definition.requester}
              request={swap.variant.request}
            />
          </Primitive>
        ))}
        <Primitive title="Handshake · connect">
          <ApprovalHeader
            direction={direction}
            requester={connect.definition.requester}
            request={connect.variant.request}
            animate
          />
        </Primitive>
      </PrimitiveSection>
      <PrimitiveSection title="Identity">
        <Primitive title="Software account">
          <ApprovalIdentity request={swap.variant.request} world={software} />
        </Primitive>
        <Primitive title="Ledger account">
          <ApprovalIdentity request={swap.variant.request} world={ledger} />
        </Primitive>
        <Primitive title="Vault funds and personal signer">
          <ApprovalIdentity request={vault.variant.request} world={software} />
        </Primitive>
        {bitcoinVault ? (
          <Primitive title="Signers">
            <ApprovalSigners vault={bitcoinVault} step="co-sign" />
          </Primitive>
        ) : null}
      </PrimitiveSection>
      <PrimitiveSection title="Rows">
        <Primitive title="Balance changes">
          <ApprovalMovements request={swap.variant.request} rowsStyle={direction.rows} />
        </Primitive>
        <Primitive title="Enforced limits">
          <ApprovalLimits request={swap.variant.request} rowsStyle={direction.rows} />
        </Primitive>
        <Primitive title="Contract call and fee">
          <ApprovalContract request={swap.variant.request} rowsStyle={direction.rows} />
          <ApprovalFee request={swap.variant.request} feePayerName="Account 1" />
        </Primitive>
        <Primitive title="Message">
          <ApprovalMessage request={message.variant.request} />
        </Primitive>
      </PrimitiveSection>
      <PrimitiveSection title="Notices">
        <Primitive title="Unmapped call without limits">
          <ApprovalNotices
            notices={getApprovalNotices(generic.variant.request, generic.definition.requester)}
          />
        </Primitive>
        <Primitive title="Vault co-sign">
          <ApprovalNotices
            notices={getApprovalNotices(vault.variant.request, vault.definition.requester)}
          />
        </Primitive>
      </PrimitiveSection>
      <PrimitiveSection title="Confirm">
        <Primitive title="Click after review time">
          <ConfirmDemo hold={false} />
        </Primitive>
        <Primitive title="Hold to approve">
          <ConfirmDemo hold />
        </Primitive>
      </PrimitiveSection>
      <PrimitiveSection title="Ledger device sheet">
        {ledgerDeviceStates.map(state => (
          <Primitive key={state} title={state}>
            <ApprovalLedgerSheet state={state} chain="stacks" interactive={false} />
          </Primitive>
        ))}
      </PrimitiveSection>
    </Flex>
  );
}
