import QRCode from 'react-qr-code';

import { Box, Stack, styled } from 'leather-styles/jsx';
import { token } from 'leather-styles/tokens';

import { AddressDisplayer, Button, CheckmarkIcon, CopyIcon, useClipboard } from '@leather.io/ui';

const qrSize = 160;

interface AddressQrProps {
  address: string;
}

function getCopyLabel(hasCopied: boolean, hasCopyFailed: boolean) {
  if (hasCopied) return 'Copied';
  if (hasCopyFailed) return 'Copy failed, try again';
  return 'Copy address';
}

export function AddressQr({ address }: AddressQrProps) {
  const { onCopy, hasCopied, hasCopyFailed } = useClipboard(address);

  return (
    <Stack gap="space.04" alignItems="center">
      <Box p="space.04" borderRadius="md" bg="ink.background-primary" border="default">
        <QRCode
          bgColor={token('colors.ink.background-primary')}
          fgColor={token('colors.ink.text-primary')}
          size={qrSize}
          value={address}
          viewBox={`0 0 ${qrSize} ${qrSize}`}
          aria-label="Address QR code"
        />
      </Box>
      <AddressDisplayer address={address} justifyContent="center" maxWidth="260px" />
      <Button
        variant="outline"
        size="md"
        iconStart={hasCopied ? <CheckmarkIcon /> : <CopyIcon />}
        onClick={() => void onCopy()}
      >
        {getCopyLabel(hasCopied, hasCopyFailed)}
      </Button>
      {hasCopyFailed && (
        <styled.span role="status" textStyle="caption.01" color="red.action-primary-default">
          Unable to copy the address
        </styled.span>
      )}
    </Stack>
  );
}
