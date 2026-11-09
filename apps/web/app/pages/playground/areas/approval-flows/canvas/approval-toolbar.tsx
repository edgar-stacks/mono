import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { type ApprovalDirection, approvalDirections } from '../directions/direction-registry';
import {
  type ApprovalView,
  catalogViewUrl,
  createRunId,
  prototypeUrl,
  withParam,
} from '../journeys/journey-navigation';

const toolbarViews: { view: ApprovalView; label: string }[] = [
  { view: 'screens', label: 'Screens' },
  { view: 'primitives', label: 'Primitives' },
  { view: 'activity', label: 'Activity' },
  { view: 'journeys', label: 'Journeys' },
];

interface ApprovalToolbarProps {
  view: ApprovalView;
  params: URLSearchParams;
  direction: ApprovalDirection;
}

export function ApprovalToolbar({ view, params, direction }: ApprovalToolbarProps) {
  const navigate = useNavigate();
  const [showDiscarded, setShowDiscarded] = useState(!direction.isFocused);
  const directions = approvalDirections.filter(
    candidate => showDiscarded || !candidate.isDiscarded || candidate.id === direction.id
  );

  function linkFor(target: ApprovalView) {
    if (target === 'journeys') {
      return prototypeUrl(params, { journeyId: 'connect', variantId: 'first' }, createRunId());
    }
    return catalogViewUrl(params, target);
  }

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      alignItems={{ base: 'stretch', md: 'center' }}
      justifyContent="space-between"
      gap="space.03"
      px={{ base: 'space.04', md: 'space.06' }}
      py="space.04"
      borderBottomWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      position="sticky"
      top={0}
      zIndex={10}
      bg="ink.background-primary"
    >
      <Flex direction="column" gap="space.01">
        <styled.h1 textStyle="heading.05" color="ink.text-primary">
          Approval flows
        </styled.h1>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Illustrative fixtures only — no requests, no devices.
        </styled.span>
      </Flex>
      <Flex gap="space.02" flexWrap="wrap" alignItems="center">
        <Flex as="nav" gap="space.01" aria-label="Views" flexWrap="wrap">
          {toolbarViews.map(item => (
            <Link key={item.view} to={linkFor(item.view)} style={{ textDecoration: 'none' }}>
              <styled.span
                display="block"
                textStyle="label.03"
                px="space.03"
                py="space.02"
                borderRadius="sm"
                color={item.view === view ? 'ink.background-primary' : 'ink.text-primary'}
                bg={item.view === view ? 'ink.text-primary' : 'transparent'}
                _hover={{
                  bg: item.view === view ? 'ink.text-primary' : 'ink.background-secondary',
                }}
                aria-current={item.view === view ? 'page' : undefined}
              >
                {item.label}
              </styled.span>
            </Link>
          ))}
        </Flex>
        <styled.label display="flex" alignItems="center" gap="space.02">
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Direction
          </styled.span>
          <styled.select
            textStyle="label.03"
            px="space.02"
            py="space.01"
            borderRadius="sm"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="ink.border-default"
            bg="ink.background-primary"
            color="ink.text-primary"
            value={direction.id}
            onChange={event => void navigate(withParam(params, 'direction', event.target.value))}
          >
            {directions.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
                {candidate.isFocused ? ' (focused)' : ''}
                {candidate.isDiscarded ? ' (discarded)' : ''}
              </option>
            ))}
          </styled.select>
        </styled.label>
        <styled.label display="flex" alignItems="center" gap="space.01">
          <input
            type="checkbox"
            checked={showDiscarded}
            onChange={event => setShowDiscarded(event.target.checked)}
          />
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Show discarded
          </styled.span>
        </styled.label>
      </Flex>
    </Flex>
  );
}
