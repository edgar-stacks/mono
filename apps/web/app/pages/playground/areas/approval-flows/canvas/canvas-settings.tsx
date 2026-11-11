import { useSearchParams } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { approvalDirections, findDirection } from '../directions/direction-registry';
import type { ConfirmMode } from '../pattern/approval-footer';

export function useCanvasSettings() {
  const [params, setParams] = useSearchParams();
  const direction = findDirection(params.get('direction'));
  const showReferences = params.get('references') === 'show';
  const confirmMode: ConfirmMode = params.get('confirm') === 'hold' ? 'hold' : 'press';

  function update(key: string, value: string | null) {
    setParams(
      current => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  }

  return { params, direction, showReferences, confirmMode, update };
}

const selectStyles = {
  textStyle: 'label.03',
  px: 'space.02',
  py: 'space.01',
  borderRadius: 'xs',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'ink.border-default',
  bg: 'ink.background-primary',
  color: 'ink.text-primary',
} as const;

export function CanvasSettings() {
  const { direction, showReferences, confirmMode, update } = useCanvasSettings();
  const directions = approvalDirections.filter(
    candidate => showReferences || candidate.status === 'focused' || candidate.id === direction.id
  );
  return (
    <Flex alignItems="center" gap="space.03" flexWrap="wrap">
      <styled.label display="flex" alignItems="center" gap="space.02">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Direction
        </styled.span>
        <styled.select
          {...selectStyles}
          value={direction.id}
          onChange={event => update('direction', event.target.value)}
        >
          {directions.map(candidate => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.status === 'reference'
                ? `${candidate.label} (reference)`
                : candidate.label}
            </option>
          ))}
        </styled.select>
      </styled.label>
      <styled.label display="flex" alignItems="center" gap="space.01">
        <input
          type="checkbox"
          checked={showReferences}
          onChange={event => update('references', event.target.checked ? 'show' : null)}
        />
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Show discarded directions
        </styled.span>
      </styled.label>
      <styled.label display="flex" alignItems="center" gap="space.02">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Approve
        </styled.span>
        <styled.select
          {...selectStyles}
          value={confirmMode}
          onChange={event => update('confirm', event.target.value === 'hold' ? 'hold' : null)}
        >
          <option value="press">Press</option>
          <option value="hold">Hold</option>
        </styled.select>
      </styled.label>
    </Flex>
  );
}
