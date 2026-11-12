import { type ReactNode } from 'react';

import { Box } from 'leather-styles/jsx';

import { Tabs } from '@leather.io/ui';

interface TabPageTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabPageProps {
  tabs: TabPageTab[];
  defaultValue?: string;
}

export function TabPage({ tabs, defaultValue }: TabPageProps) {
  return (
    <Tabs.Root defaultValue={defaultValue ?? tabs[0]?.value} data-recipe="tab-page">
      <Tabs.List>
        {tabs.map(tab => (
          <Tabs.Trigger key={tab.value} value={tab.value}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map(tab => (
        <Tabs.Content key={tab.value} value={tab.value}>
          <Box py="space.04">{tab.content}</Box>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
