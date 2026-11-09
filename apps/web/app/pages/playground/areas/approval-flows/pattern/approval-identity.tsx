import { Box, Flex, styled } from 'leather-styles/jsx';

import { AddressDisplayer, LedgerIcon, VaultIcon, WalletIcon } from '@leather.io/ui';

import type {
  ApprovalAccount,
  ApprovalChain,
  ApprovalRequester,
} from '../scenarios/approval-scenario.types';

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
      borderRadius="round"
      bg="ink.text-primary"
      color="ink.background-primary"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      fontWeight={600}
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
    <Flex alignItems="center" gap="space.03" minWidth={0}>
      <RequesterMark requester={requester} size={32} />
      <Flex direction="column" minWidth={0}>
        <styled.span textStyle="label.02" color="ink.text-primary">
          {requester.name}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued" truncate>
          {requester.origin}
          {requester.verified ? null : ' · not verified'}
        </styled.span>
      </Flex>
    </Flex>
  );
}

function AccountKindIcon({ account }: { account: ApprovalAccount }) {
  if (account.kind === 'ledger') return <LedgerIcon variant="small" />;
  if (account.kind === 'vault') return <VaultIcon variant="small" />;
  return <WalletIcon variant="small" />;
}

const accountKindLabel = {
  software: 'Software account',
  ledger: 'Ledger',
  vault: 'Vault · 2 of 3',
} as const;

interface AccountIdentityProps {
  account: ApprovalAccount;
  chain: ApprovalChain;
  role?: string;
}

export function AccountIdentity({ account, chain, role }: AccountIdentityProps) {
  const address = account.addresses[chain];
  return (
    <Flex direction="column" gap="space.01">
      {role ? (
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {role}
        </styled.span>
      ) : null}
      <Flex alignItems="center" gap="space.02">
        <Box color="ink.text-primary">
          <AccountKindIcon account={account} />
        </Box>
        <styled.span textStyle="label.02" color="ink.text-primary">
          {account.label}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {accountKindLabel[account.kind]}
        </styled.span>
      </Flex>
      {address ? <AddressDisplayer address={address} textStyle="caption.01" /> : null}
    </Flex>
  );
}
