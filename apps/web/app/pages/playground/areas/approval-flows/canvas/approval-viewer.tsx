import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-registry';
import { catalogViewUrl, createRunId, launchPrototypeUrl } from '../journeys/journey-navigation';
import { approvalScreens, findApprovalScreen } from '../scenarios/scenario-catalog';
import type { ApprovalScreen } from '../scenarios/scenario-types';
import { CaptureFrame, PopupFrame, ScreenPreview } from './approval-frames';

interface IssuesPanelProps {
  screen: ApprovalScreen;
}

function IssuesPanel({ screen }: IssuesPanelProps) {
  return (
    <Flex direction="column" gap="space.03" maxWidth="360px">
      <styled.h3 textStyle="label.01" color="ink.text-primary">
        What reviewers should judge
      </styled.h3>
      <styled.ul
        display="flex"
        flexDirection="column"
        gap="space.02"
        pl="space.04"
        listStyleType="disc"
      >
        <styled.li textStyle="body.02" color="ink.text-primary">
          Who is asking, and from which site?
        </styled.li>
        <styled.li textStyle="body.02" color="ink.text-primary">
          Which account or vault signs, and whose funds move?
        </styled.li>
        <styled.li textStyle="body.02" color="ink.text-primary">
          The amount, the fee and the limits the network enforces.
        </styled.li>
        <styled.li textStyle="body.02" color="ink.text-primary">
          What happens after signing.
        </styled.li>
      </styled.ul>
      {screen.issues.length > 0 ? (
        <>
          <styled.h3 textStyle="label.01" color="ink.text-primary">
            Issues with the current screen
          </styled.h3>
          <styled.ul
            display="flex"
            flexDirection="column"
            gap="space.02"
            pl="space.04"
            listStyleType="disc"
          >
            {screen.issues.map(issue => (
              <styled.li key={issue} textStyle="body.02" color="ink.text-subdued">
                {issue}
              </styled.li>
            ))}
          </styled.ul>
        </>
      ) : null}
    </Flex>
  );
}

interface ApprovalViewerProps {
  params: URLSearchParams;
  direction: ApprovalDirection;
}

export function ApprovalViewer({ params, direction }: ApprovalViewerProps) {
  const navigate = useNavigate();
  const screen = findApprovalScreen(params.get('screen')) ?? approvalScreens[0];
  if (!screen) return null;
  const index = approvalScreens.indexOf(screen);
  const previous = approvalScreens[index - 1];
  const next = approvalScreens[index + 1];

  function goTo(target: ApprovalScreen | undefined) {
    if (target) void navigate(catalogViewUrl(params, 'viewer', { screen: target.id }));
  }

  return (
    <Flex direction="column" gap="space.05" px={{ base: 'space.04', md: 'space.06' }} py="space.06">
      <Flex direction={{ base: 'column', md: 'row' }} justifyContent="space-between" gap="space.03">
        <Flex direction="column" gap="space.01">
          <styled.h2 textStyle="heading.04" color="ink.text-primary">
            {screen.title}
          </styled.h2>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {screen.summary}
          </styled.p>
        </Flex>
        <Flex gap="space.02" flexWrap="wrap" alignItems="center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigate(catalogViewUrl(params, 'screens'))}
          >
            All screens
          </Button>
          <Button variant="outline" size="sm" disabled={!previous} onClick={() => goTo(previous)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!next} onClick={() => goTo(next)}>
            Next
          </Button>
          <Button
            size="sm"
            onClick={() =>
              void navigate(
                launchPrototypeUrl(
                  params,
                  {
                    journeyId: screen.journeyId,
                    variantId: screen.variantId,
                    wallet: screen.wallet,
                  },
                  createRunId()
                )
              )
            }
          >
            Launch prototype
          </Button>
        </Flex>
      </Flex>
      <Flex gap="space.06" flexWrap="wrap" alignItems="start">
        <PopupFrame label={`Proposed · ${direction.label}`}>
          <ScreenPreview screen={screen} direction={direction} />
        </PopupFrame>
        <CaptureFrame screen={screen} />
        <IssuesPanel screen={screen} />
      </Flex>
    </Flex>
  );
}
