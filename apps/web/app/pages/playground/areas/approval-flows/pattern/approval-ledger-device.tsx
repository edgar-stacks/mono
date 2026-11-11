import { Box, Flex, styled } from 'leather-styles/jsx';

interface ApprovalLedgerDeviceProps {
  lines: string[];
}

export function ApprovalLedgerDevice({ lines }: ApprovalLedgerDeviceProps) {
  return (
    <Flex alignItems="center" justifyContent="center" aria-label="Ledger device screen" role="img">
      <Box width="18px" height="64px" borderRadius="4px 0 0 4px" bg="ink.text-subdued" />
      <Flex
        direction="column"
        justifyContent="center"
        gap="space.01"
        width="220px"
        height="96px"
        px="space.04"
        borderRadius="md"
        bg="ink.text-primary"
        boxShadow="inset 0 0 0 6px rgba(255, 255, 255, 0.08)"
      >
        {lines.map(line => (
          <styled.span
            key={line}
            textStyle="caption.02"
            color="ink.background-primary"
            textAlign="center"
            fontFamily="mono"
            truncate
          >
            {line}
          </styled.span>
        ))}
      </Flex>
      <Flex direction="column" gap="space.01" ml="space.01">
        <Box width="10px" height="10px" borderRadius="round" bg="ink.text-subdued" />
        <Box width="10px" height="10px" borderRadius="round" bg="ink.text-subdued" />
      </Flex>
    </Flex>
  );
}
