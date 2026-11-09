import { type ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

interface ReceiveAssetIdentityProps {
  avatar: ReactNode;
  name: string;
  network: string;
}

export function ReceiveAssetIdentity({ avatar, name, network }: ReceiveAssetIdentityProps) {
  return (
    <Flex alignItems="center" gap="space.03">
      {avatar}
      <Stack gap="0">
        <styled.span textStyle="label.01">{name}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {network}
        </styled.span>
      </Stack>
    </Flex>
  );
}
