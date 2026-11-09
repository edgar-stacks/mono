import { type ReactNode } from 'react';

import { Box } from 'leather-styles/jsx';

import { Tabs } from '@leather.io/ui';

interface TabPageTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabPageProps {
  tabs: TabPageTab[];
  defaultTabId?: string;
}

export function TabPage({ tabs, defaultTabId }: TabPageProps) {
  return (
    <Tabs.Root defaultValue={defaultTabId ?? tabs[0]?.id}>
      <Tabs.List>
        {tabs.map(tab => (
          <Tabs.Trigger key={tab.id} value={tab.id}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map(tab => (
        <Tabs.Content key={tab.id} value={tab.id}>
          <Box pt="space.04">{tab.content}</Box>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
