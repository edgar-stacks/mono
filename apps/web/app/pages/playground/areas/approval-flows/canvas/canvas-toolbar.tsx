import { Link } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { type CanvasView, canvasUrl } from '../journeys/journey-navigation';
import { CanvasSettings } from './canvas-settings';

const tabs: { view: CanvasView; label: string }[] = [
  { view: 'screens', label: 'Screens' },
  { view: 'viewer', label: 'Viewer' },
  { view: 'primitives', label: 'Primitives' },
  { view: 'activity', label: 'Activity' },
  { view: 'journeys', label: 'Journeys' },
];

interface CanvasToolbarProps {
  view: CanvasView;
  params: URLSearchParams;
}

export function CanvasToolbar({ view, params }: CanvasToolbarProps) {
  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      alignItems={{ base: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      gap="space.03"
      px={{ base: 'space.04', md: 'space.06' }}
      py="space.04"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-transparent"
      position="sticky"
      top="0"
      zIndex="10"
      bg="ink.background-primary"
    >
      <Flex alignItems="center" gap="space.04" flexWrap="wrap">
        <styled.h1 textStyle="heading.05" color="ink.text-primary">
          Approval flows
        </styled.h1>
        <styled.nav display="flex" gap="space.01" flexWrap="wrap" aria-label="Approval flows views">
          {tabs.map(tab => (
            <Link
              key={tab.view}
              to={canvasUrl(params, tab.view)}
              aria-current={tab.view === view ? 'page' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <styled.span
                display="block"
                textStyle="label.03"
                px="space.03"
                py="space.01"
                borderRadius="round"
                bg={tab.view === view ? 'ink.text-primary' : 'transparent'}
                color={tab.view === view ? 'ink.background-primary' : 'ink.text-subdued'}
                _hover={{
                  color: tab.view === view ? 'ink.background-primary' : 'ink.text-primary',
                }}
              >
                {tab.label}
              </styled.span>
            </Link>
          ))}
        </styled.nav>
      </Flex>
      <CanvasSettings />
    </Flex>
  );
}
