import QRCode from 'react-qr-code';

import { Box, Flex, styled } from 'leather-styles/jsx';
import { token } from 'leather-styles/tokens';
import { CopyAddress } from '~/components/copy-address';

const qrCodeSize = 160;

interface AddressQrProps {
  address: string;
  caption?: string;
}

export function AddressQr({ address, caption }: AddressQrProps) {
  return (
    <Flex direction="column" alignItems="center" gap="space.04" data-recipe="address-qr">
      <Box
        p="space.04"
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-transparent"
        bg="ink.background-primary"
      >
        <QRCode
          bgColor={token('colors.ink.background-primary')}
          fgColor={token('colors.ink.text-primary')}
          size={qrCodeSize}
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          value={address}
          viewBox={`0 0 ${qrCodeSize} ${qrCodeSize}`}
        />
      </Box>
      <Box maxWidth="260px" textAlign="center">
        <CopyAddress addr={address} grouped />
      </Box>
      {caption ? (
        <styled.p textStyle="caption.01" color="ink.text-subdued" textAlign="center">
          {caption}
        </styled.p>
      ) : null}
    </Flex>
  );
}
