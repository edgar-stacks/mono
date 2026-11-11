import { Box, Flex, styled } from 'leather-styles/jsx';

import { BitcoinIcon, LedgerIcon, StacksIcon, VaultIcon } from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import type {
  ApprovalChain,
  ApprovalRequester,
  ApprovalSigner,
  ApprovalVault,
} from '../scenarios/approval-model';

interface RequesterMarkProps {
  requester: ApprovalRequester;
  size?: number;
}

export function RequesterMark({ requester, size = 40 }: RequesterMarkProps) {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      borderRadius="sm"
      color="ink.background-primary"
      fontWeight="600"
      style={{
        width: size,
        height: size,
        backgroundColor: requester.tint,
        fontSize: Math.round(size * 0.45),
      }}
      aria-hidden
    >
      {requester.monogram}
    </Flex>
  );
}

interface RequesterIdentityProps {
  requester: ApprovalRequester;
}

export function RequesterIdentity({ requester }: RequesterIdentityProps) {
  return (
    <Flex alignItems="center" gap="space.03" minWidth="0">
      <RequesterMark requester={requester} />
      <Flex direction="column" minWidth="0">
        <styled.span textStyle="label.02" color="ink.text-primary">
          {requester.name}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued" truncate>
          {requester.origin}
        </styled.span>
      </Flex>
      {requester.firstVisit ? (
        <Box ml="auto" flexShrink={0}>
          <FirstVisitBadge />
        </Box>
      ) : null}
    </Flex>
  );
}

export function FirstVisitBadge() {
  return (
    <styled.span
      px="space.02"
      py="space.00"
      borderRadius="xs"
      bg="yellow.background-secondary"
      color="yellow.text-primary"
      textStyle="caption.02"
    >
      First visit
    </styled.span>
  );
}

function ChainIcon({ chain }: { chain: ApprovalChain }) {
  return chain === 'bitcoin' ? <BitcoinIcon variant="small" /> : <StacksIcon variant="small" />;
}

export function shortAddress(address: string) {
  return truncateMiddle(address, 5);
}

interface SignerIdentityProps {
  signer: ApprovalSigner;
  label?: string;
}

export function SignerIdentity({ signer, label = 'Signing with' }: SignerIdentityProps) {
  return (
    <Flex alignItems="center" gap="space.03" minWidth="0">
      <Flex
        alignItems="center"
        justifyContent="center"
        width="32px"
        height="32px"
        borderRadius="round"
        bg="ink.component-background-default"
        color="ink.text-primary"
        flexShrink={0}
      >
        {signer.kind === 'ledger' ? (
          <LedgerIcon variant="small" />
        ) : (
          <ChainIcon chain={signer.chain} />
        )}
      </Flex>
      <Flex direction="column" minWidth="0">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {label}
        </styled.span>
        <styled.span textStyle="label.03" color="ink.text-primary">
          {signer.accountName} · {shortAddress(signer.address)}
        </styled.span>
      </Flex>
      {signer.kind === 'ledger' ? (
        <styled.span ml="auto" textStyle="caption.02" color="ink.text-subdued" flexShrink={0}>
          Ledger
        </styled.span>
      ) : null}
    </Flex>
  );
}

interface VaultIdentityProps {
  vault: ApprovalVault;
}

export function VaultIdentity({ vault }: VaultIdentityProps) {
  return (
    <Flex alignItems="center" gap="space.03" minWidth="0">
      <Flex
        alignItems="center"
        justifyContent="center"
        width="32px"
        height="32px"
        borderRadius="sm"
        bg="orange.background-primary"
        color="orange.text-primary"
        flexShrink={0}
      >
        <VaultIcon variant="small" />
      </Flex>
      <Flex direction="column" minWidth="0">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Funds from vault
        </styled.span>
        <styled.span textStyle="label.03" color="ink.text-primary">
          {vault.name} · {shortAddress(vault.address)}
        </styled.span>
      </Flex>
      <Box ml="auto" flexShrink={0}>
        <styled.span textStyle="caption.02" color="ink.text-subdued">
          {vault.threshold} of {vault.signers.length}
        </styled.span>
      </Box>
    </Flex>
  );
}
