import { useNavigate, useSearchParams } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { CheckmarkCircleIcon, ErrorTriangleIcon } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-registry';
import { journeyFamilies, resolveJourney } from '../journeys/journey-definitions';
import { createRunId, prototypeUrl, viewUrl } from '../journeys/journey-navigation';
import { approvalScreens, findApprovalScreen } from '../scenarios/approval-screens';
import { canvasButton, canvasSelect } from './canvas-styles';
import { CaptureFrame } from './capture-frame';
import { ExtensionFrame } from './extension-frame';
import { reviewChecks } from './review-checks';
import { ScreenPreview } from './screen-preview';

interface ScreenViewerProps {
  screenId: string | null;
  direction: ApprovalDirection;
}

export function ScreenViewer({ screenId, direction }: ScreenViewerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const entry = findApprovalScreen(screenId);
  const family = journeyFamilies.find(candidate => candidate.id === entry.familyId);
  const { request } = resolveJourney({
    familyId: entry.familyId,
    variantId: entry.variantId,
    wallet: entry.wallet,
  });
  const checks = reviewChecks(request);
  const index = approvalScreens.indexOf(entry);

  function show(id: string) {
    void navigate(viewUrl(searchParams, 'viewer', { screen: id }));
  }

  function launch() {
    const current = new URLSearchParams(searchParams);
    current.set('wallet', entry.wallet);
    void navigate(
      prototypeUrl(current, {
        journey: entry.familyId,
        variant: entry.variantId,
        run: createRunId(),
        returnTo: `?${searchParams.toString()}`,
      })
    );
  }

  return (
    <Flex direction="column" gap="space.05" px={{ base: 'space.03', md: 'space.06' }} py="space.06">
      <Flex direction={{ base: 'column', md: 'row' }} gap="space.03" alignItems={{ md: 'center' }}>
        <select
          aria-label="Screen"
          value={entry.id}
          onChange={event => show(event.target.value)}
          className={canvasSelect}
        >
          {approvalScreens.map(candidate => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.id}
            </option>
          ))}
        </select>
        <Flex gap="space.02">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => show(approvalScreens[index - 1].id)}
            className={canvasButton}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={index >= approvalScreens.length - 1}
            onClick={() => show(approvalScreens[index + 1].id)}
            className={canvasButton}
          >
            Next
          </button>
          <button type="button" onClick={launch} className={canvasButton}>
            Launch prototype
          </button>
        </Flex>
      </Flex>
      <Flex gap="space.06" direction={{ base: 'column', lg: 'row' }} alignItems="flex-start">
        <Flex gap="space.05" overflowX="auto" maxWidth="100%" pb="space.02">
          <ExtensionFrame label={`Proposed · ${direction.label}`}>
            <ScreenPreview entry={entry} direction={direction} interactive />
          </ExtensionFrame>
          <CaptureFrame screenId={entry.id} />
        </Flex>
        <Flex direction="column" gap="space.04" maxWidth="360px" width="100%">
          <Flex direction="column" gap="space.01">
            <styled.h2 textStyle="heading.05" color="ink.text-primary">
              {family?.title}
            </styled.h2>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {entry.note}
            </styled.p>
          </Flex>
          <Flex direction="column" gap="space.02" aria-label="Review checks">
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              Can a reviewer identify…
            </styled.span>
            {checks.map(check => (
              <Flex key={check.label} gap="space.02" alignItems="flex-start">
                {check.clear ? (
                  <CheckmarkCircleIcon variant="small" color="green.action-primary-default" />
                ) : (
                  <ErrorTriangleIcon variant="small" color="yellow.action-primary-default" />
                )}
                <Flex direction="column">
                  <styled.span textStyle="label.03" color="ink.text-primary">
                    {check.label}
                  </styled.span>
                  <styled.span textStyle="caption.01" color="ink.text-subdued">
                    {check.note}
                  </styled.span>
                </Flex>
              </Flex>
            ))}
          </Flex>
          <Flex direction="column" gap="space.01">
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              Direction
            </styled.span>
            <styled.p textStyle="body.02" color="ink.text-primary">
              {direction.label}: {direction.summary}
            </styled.p>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
