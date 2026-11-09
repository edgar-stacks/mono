import { Circle, Flex, Stack } from 'leather-styles/jsx';

import { SkeletonLoader } from '@leather.io/ui';

const loadingRowCount = 4;

export function ActivityDetailsLoading() {
  return (
    <Stack gap="space.04" py="space.05" aria-busy="true">
      <Stack alignItems="center" gap="space.03">
        <Circle bgColor="ink.component-background-default" size="56px" />
        <SkeletonLoader isLoading height="20px" width="140px" />
        <SkeletonLoader isLoading height="14px" width="100px" />
      </Stack>
      {Array.from({ length: loadingRowCount }).map((_, index) => (
        <Flex key={index} px="space.05" justifyContent="space-between">
          <SkeletonLoader isLoading height="14px" width="80px" />
          <SkeletonLoader isLoading height="14px" width="120px" />
        </Flex>
      ))}
    </Stack>
  );
}
