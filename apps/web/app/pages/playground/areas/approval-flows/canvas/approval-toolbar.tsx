import { Link, useSearchParams } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { type ApprovalDirection, approvalDirections } from '../directions/direction-registry';
import { type ApprovalFlowView, viewUrl } from '../journeys/journey-navigation';
import { canvasSelect } from './canvas-styles';

const toolbarViews: { view: ApprovalFlowView; label: string }[] = [
  { view: 'screens', label: 'Screens' },
  { view: 'primitives', label: 'Primitives' },
  { view: 'activity', label: 'Activity' },
  { view: 'journeys', label: 'Journeys' },
];

interface ApprovalToolbarProps {
  view: ApprovalFlowView;
  direction: ApprovalDirection;
  showReferences: boolean;
  onShowReferencesChange(value: boolean): void;
}

export function ApprovalToolbar({
  view,
  direction,
  showReferences,
  onShowReferencesChange,
}: ApprovalToolbarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const directions = approvalDirections.filter(
    candidate => showReferences || candidate.status === 'focused' || candidate.id === direction.id
  );

  function selectDirection(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set('direction', id);
    setSearchParams(next);
  }

  return (
    <Flex
      position="sticky"
      top={0}
      zIndex={10}
      direction={{ base: 'column', md: 'row' }}
      alignItems={{ base: 'stretch', md: 'center' }}
      justifyContent="space-between"
      gap="space.03"
      px={{ base: 'space.04', md: 'space.06' }}
      py="space.03"
      bg="ink.background-primary"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-default"
    >
      <Flex alignItems="center" gap="space.04" flexWrap="wrap">
        <styled.h1 textStyle="label.01" color="ink.text-primary">
          Approval flows
        </styled.h1>
        <styled.nav display="flex" gap="space.01" flexWrap="wrap" aria-label="Approval flow views">
          {toolbarViews.map(item => (
            <Link
              key={item.view}
              to={viewUrl(searchParams, item.view)}
              style={{ textDecoration: 'none' }}
            >
              <styled.span
                display="block"
                textStyle="label.03"
                px="space.03"
                py="space.01"
                borderRadius="round"
                color={item.view === view ? 'ink.background-primary' : 'ink.text-subdued'}
                bg={item.view === view ? 'ink.text-primary' : 'transparent'}
                aria-current={item.view === view ? 'page' : undefined}
              >
                {item.label}
              </styled.span>
            </Link>
          ))}
        </styled.nav>
      </Flex>
      <Flex alignItems="center" gap="space.03" flexWrap="wrap">
        <styled.label display="flex" alignItems="center" gap="space.02" textStyle="caption.01">
          <styled.span color="ink.text-subdued">Direction</styled.span>
          <select
            value={direction.id}
            onChange={event => selectDirection(event.target.value)}
            className={canvasSelect}
          >
            {directions.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.status === 'focused'
                  ? candidate.label
                  : `${candidate.label} (reference)`}
              </option>
            ))}
          </select>
        </styled.label>
        <styled.label display="flex" alignItems="center" gap="space.02" textStyle="caption.01">
          <input
            type="checkbox"
            checked={showReferences}
            onChange={event => onShowReferencesChange(event.target.checked)}
          />
          <styled.span color="ink.text-subdued">Show discarded directions</styled.span>
        </styled.label>
      </Flex>
    </Flex>
  );
}
