import { Flex, Stack } from 'leather-styles/jsx';

import { SkeletonLoader } from '@leather.io/ui';

const loadingRowCount = 4;

export function ActivityDetailsLoading() {
  return (
    <Stack gap="space.03" px="space.05" py="space.05">
      <Flex justifyContent="center">
        <SkeletonLoader isLoading height="56px" width="56px" borderRadius="round" />
      </Flex>
      <Flex justifyContent="center">
        <SkeletonLoader isLoading height="20px" width="160px" />
      </Flex>
      {Array.from({ length: loadingRowCount }, (_, index) => (
        <Flex key={index} alignItems="center" justifyContent="space-between">
          <SkeletonLoader isLoading height="14px" width="80px" />
          <SkeletonLoader isLoading height="14px" width="120px" />
        </Flex>
      ))}
    </Stack>
  );
}
