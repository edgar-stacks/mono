import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

interface ReceiveAssetIdentityProps {
  avatar: ReactNode;
  name: string;
  network: string;
}

export function ReceiveAssetIdentity({ avatar, name, network }: ReceiveAssetIdentityProps) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      gap="space.03"
      data-recipe="receive-asset-identity"
    >
      {avatar}
      <Flex direction="column" alignItems="center" gap="space.01">
        <styled.h2 textStyle="heading.05" color="ink.text-primary">
          Receive {name}
        </styled.h2>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Only send {network} network assets to this address
        </styled.span>
      </Flex>
    </Flex>
  );
}
