import type React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen/screen';

import { Box, type HasChildren, useTheme } from '@leather.io/ui/native';

interface FullHeightSheetLayoutProps extends HasChildren {
  header: React.ReactNode;
  testID?: string;
}
export function FullHeightSheetLayout({ children, header, testID }: FullHeightSheetLayoutProps) {
  const { bottom } = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Screen testID={testID}>
      <Box paddingTop="4">{header}</Box>
      <Box
        flex={1}
        style={{
          paddingBottom: Math.max(theme.spacing[7], bottom),
          paddingTop: theme.spacing[4],
        }}
      >
        {children}
      </Box>
    </Screen>
  );
}
