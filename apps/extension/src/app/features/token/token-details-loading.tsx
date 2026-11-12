import { Box, Circle, Flex, Stack } from 'leather-styles/jsx';

import { historicalPeriods } from '@leather.io/models';
import { SkeletonLoader } from '@leather.io/ui';

import { DetailsSection } from '@app/components/details/details-section';

import { TokenActivityLoading } from './components/token-activity-loading';
import { TokenDetailsHeader } from './components/token-details-header';

function LoadingRow() {
  return (
    <Flex
      px="space.05"
      py="space.01"
      alignItems="center"
      justifyContent="space-between"
      minHeight="30px"
    >
      <SkeletonLoader isLoading height="14px" width="80px" />
      <SkeletonLoader isLoading height="14px" width="100px" />
    </Flex>
  );
}

function LoadingOverview() {
  return (
    <Stack
      bg="ink.background-primary"
      alignItems="center"
      justifyContent="center"
      p="space.05"
      gap="space.03"
    >
      <Circle bgColor="ink.component-background-default" size="64px" />
      <Stack gap="space.02" alignItems="center">
        <SkeletonLoader isLoading height="32px" width="160px" />
        <SkeletonLoader isLoading height="20px" width="100px" />
      </Stack>
      <Flex gap="space.02" pt="space.02">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} isLoading height="36px" width="78px" borderRadius="999px" />
        ))}
      </Flex>
    </Stack>
  );
}

function LoadingPrice() {
  return (
    <Stack gap="space.03" px="space.05" pb="space.02">
      <Stack gap="space.01">
        <SkeletonLoader isLoading height="24px" width="120px" />
        <SkeletonLoader isLoading height="20px" width="140px" />
      </Stack>
      <Flex gap="space.01">
        {Array.from({ length: historicalPeriods.length }).map((_, i) => (
          <SkeletonLoader key={i} isLoading height="24px" flex="1" />
        ))}
      </Flex>
    </Stack>
  );
}

function LoadingDescription() {
  return (
    <Box px="space.05" pb="space.03">
      <Stack gap="space.02">
        <SkeletonLoader isLoading height="14px" width="100%" />
        <SkeletonLoader isLoading height="14px" width="90%" />
        <SkeletonLoader isLoading height="14px" width="70%" />
      </Stack>
    </Box>
  );
}

export function TokenDetailsLoading({ title = 'Loading...' }: { title?: string }) {
  return (
    <Stack width="100%" gap="space.00" data-testid="token-details-loading">
      <TokenDetailsHeader title={title} />
      <Box width="100%" maxWidth={['100%', null, '780px']} margin="0 auto">
        <Stack bg="ink.background-secondary" borderRadius={['0', null, 'md']} overflow="hidden">
          <LoadingOverview />

          <DetailsSection title="Price">
            <LoadingPrice />
          </DetailsSection>

          <DetailsSection title="Description">
            <LoadingDescription />
          </DetailsSection>

          <DetailsSection title="Token details">
            <LoadingRow />
            <LoadingRow />
            <LoadingRow />
          </DetailsSection>

          <DetailsSection title="Activity">
            <TokenActivityLoading />
          </DetailsSection>
        </Stack>
      </Box>
    </Stack>
  );
}
