import { Box, Flex, styled } from 'leather-styles/jsx';

import type { ApprovalVault } from '../scenarios/approval-model';

export function ApprovalSigners({ vault }: { vault: ApprovalVault }) {
  const signedCount = vault.signers.filter(signer => signer.signed).length;
  return (
    <Flex direction="column" gap="space.02" py="space.02">
      <Flex justifyContent="space-between">
        <styled.span textStyle="label.03" color="ink.text-subdued">
          Signatures
        </styled.span>
        <styled.span textStyle="label.03" color="ink.text-primary">
          {signedCount} of {vault.threshold} needed
        </styled.span>
      </Flex>
      <Flex gap="space.01" aria-hidden>
        {vault.signers.map(signer => (
          <Box
            key={signer.name}
            flex="1"
            height="4px"
            borderRadius="round"
            bg={signer.signed ? 'green.action-primary-default' : 'ink.border-default'}
          />
        ))}
      </Flex>
      {vault.signers.map(signer => (
        <Flex key={signer.name} justifyContent="space-between">
          <styled.span textStyle="caption.01" color="ink.text-primary">
            {signer.isYou ? `${signer.name} (this account)` : signer.name}
          </styled.span>
          <styled.span
            textStyle="caption.01"
            color={signer.signed ? 'green.action-primary-default' : 'ink.text-subdued'}
          >
            {signer.signed ? 'Signed' : 'Waiting'}
          </styled.span>
        </Flex>
      ))}
    </Flex>
  );
}
