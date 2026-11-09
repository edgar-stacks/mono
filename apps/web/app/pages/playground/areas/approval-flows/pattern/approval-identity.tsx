import { Flex, styled } from 'leather-styles/jsx';

import {
  CheckmarkCircleIcon,
  ErrorTriangleIcon,
  LedgerIcon,
  VaultIcon,
  WalletIcon,
} from '@leather.io/ui';
import { isDefined } from '@leather.io/utils';

import type { JourneyRequest, JourneyRequester } from '../journeys/journey-definitions';
import {
  type JourneyAccount,
  type JourneyWorld,
  getJourneyAccount,
} from '../journeys/journey-world';

interface RequesterAvatarProps {
  requester: JourneyRequester;
  size?: number;
}

export function RequesterAvatar({ requester, size = 40 }: RequesterAvatarProps) {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      borderRadius="round"
      bg={requester.verified ? 'ink.text-primary' : 'ink.component-background-default'}
      color={requester.verified ? 'ink.background-primary' : 'ink.text-primary'}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <styled.span textStyle="label.02">{requester.initials}</styled.span>
    </Flex>
  );
}

interface RequesterLineProps {
  requester: JourneyRequester;
}

export function RequesterLine({ requester }: RequesterLineProps) {
  return (
    <Flex alignItems="center" gap="space.01" justifyContent="center">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {requester.origin}
      </styled.span>
      {requester.verified ? (
        <CheckmarkCircleIcon variant="small" color="green.action-primary-default" />
      ) : (
        <Flex alignItems="center" gap="space.01" color="red.action-primary-default">
          <ErrorTriangleIcon variant="small" />
          <styled.span textStyle="caption.01">Unverified site</styled.span>
        </Flex>
      )}
    </Flex>
  );
}

interface AccountIconProps {
  account: JourneyAccount;
}

function AccountIcon({ account }: AccountIconProps) {
  if (account.kind === 'vault') return <VaultIcon variant="small" />;
  if (account.kind === 'ledger') return <LedgerIcon variant="small" />;
  return <WalletIcon variant="small" />;
}

function getAccountAddress(account: JourneyAccount, request: JourneyRequest) {
  return request.chain === 'bitcoin' ? account.bitcoinAddress : account.stacksAddress;
}

function shortAddress(address: string | undefined) {
  if (!address) return undefined;
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}

interface IdentityRowProps {
  label: string;
  account: JourneyAccount;
  request: JourneyRequest;
  note?: string;
}

function IdentityRow({ label, account, request, note }: IdentityRowProps) {
  return (
    <Flex alignItems="center" justifyContent="space-between" gap="space.03">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {label}
      </styled.span>
      <Flex alignItems="center" gap="space.02" minWidth={0} color="ink.text-primary">
        <AccountIcon account={account} />
        <Flex direction="column" alignItems="end" minWidth={0}>
          <styled.span textStyle="label.03" truncate>
            {account.name}
          </styled.span>
          <styled.span textStyle="caption.02" color="ink.text-subdued">
            {note ?? shortAddress(getAccountAddress(account, request))}
          </styled.span>
        </Flex>
      </Flex>
    </Flex>
  );
}

interface ApprovalIdentityProps {
  request: JourneyRequest;
  world: JourneyWorld;
}

export function ApprovalIdentity({ request, world }: ApprovalIdentityProps) {
  const funds = getJourneyAccount(world, request.accountId);
  const personal = getJourneyAccount(world, 'personal');
  if (!funds || !personal) return null;
  const isVault = funds.kind === 'vault';

  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.03"
      borderRadius="sm"
      bg="ink.component-background-default"
      data-identity={isVault ? 'vault' : funds.kind}
    >
      {isVault ? (
        <>
          <IdentityRow
            label="Funds from"
            account={funds}
            request={request}
            note={[
              `${funds.threshold ?? funds.signers?.length} of ${funds.signers?.length} signers`,
              shortAddress(getAccountAddress(funds, request)),
            ]
              .filter(isDefined)
              .join(' · ')}
          />
          <IdentityRow label="Signing as" account={personal} request={request} />
        </>
      ) : (
        <IdentityRow
          label={request.kind === 'connect' ? 'Sharing' : 'Account'}
          account={personal}
          request={request}
        />
      )}
    </Flex>
  );
}
