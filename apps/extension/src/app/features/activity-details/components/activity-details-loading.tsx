import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { Circle, Flex, Stack } from 'leather-styles/jsx';

import { SkeletonLoader } from '@leather.io/ui';

const loadingRowCount = 5;

export function ActivityDetailsLoading() {
  return (
    <Stack gap="space.04" py="space.05" data-testid={ActivitySelectors.ActivityDetailsLoading}>
      <Stack alignItems="center" gap="space.03">
        <Circle bgColor="ink.component-background-default" size="48px" />
        <SkeletonLoader isLoading height="24px" width="160px" />
        <SkeletonLoader isLoading height="16px" width="100px" />
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
