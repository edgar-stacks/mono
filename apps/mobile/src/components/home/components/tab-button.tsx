import { Pressable, Text } from '@leather.io/ui/native';

import { TAB_WIDTH } from '../constants';

interface TabButtonProps {
  title: string;
  onPress(): void;
  isActive: boolean;
  testID?: string;
}

export function TabButton({ title, onPress, isActive, testID }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      width={TAB_WIDTH}
      py="4"
      justifyContent="center"
      alignItems="center"
    >
      <Text variant="label01" color={isActive ? 'ink.text-primary' : 'ink.text-subdued'}>
        {title}
      </Text>
    </Pressable>
  );
}
