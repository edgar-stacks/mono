import { useNavigate } from 'react-router';

import { Flex, Grid, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-registry';
import { catalogViewUrl, createRunId, launchPrototypeUrl } from '../journeys/journey-navigation';
import { approvalScreens, approvalSections } from '../scenarios/scenario-catalog';
import type { ApprovalScreen } from '../scenarios/scenario-types';
import { CaptureFrame, PopupFrame, ScreenPreview } from './approval-frames';

const catalogScale = 0.75;

interface ScreenCardProps {
  screen: ApprovalScreen;
  params: URLSearchParams;
  direction: ApprovalDirection;
}

function ScreenCard({ screen, params, direction }: ScreenCardProps) {
  const navigate = useNavigate();

  function launch() {
    void navigate(
      launchPrototypeUrl(
        params,
        { journeyId: screen.journeyId, variantId: screen.variantId, wallet: screen.wallet },
        createRunId()
      )
    );
  }

  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.04"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      data-screen={screen.id}
    >
      <Flex direction="column" gap="space.01">
        <styled.h3 textStyle="label.01" color="ink.text-primary">
          {screen.title}
        </styled.h3>
        <styled.p textStyle="caption.01" color="ink.text-subdued">
          {screen.summary}
        </styled.p>
      </Flex>
      <Flex gap="space.03" overflowX="auto" pb="space.02">
        <PopupFrame label={`Proposed · ${direction.label}`} scale={catalogScale}>
          <ScreenPreview screen={screen} direction={direction} />
        </PopupFrame>
        <CaptureFrame screen={screen} scale={catalogScale} />
      </Flex>
      <Flex gap="space.02" flexWrap="wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate(catalogViewUrl(params, 'viewer', { screen: screen.id }))}
        >
          Open
        </Button>
        <Button size="sm" onClick={launch}>
          Launch prototype
        </Button>
      </Flex>
    </Flex>
  );
}

interface ApprovalCatalogProps {
  params: URLSearchParams;
  direction: ApprovalDirection;
}

export function ApprovalCatalog({ params, direction }: ApprovalCatalogProps) {
  return (
    <Flex direction="column" gap="space.07" px={{ base: 'space.04', md: 'space.06' }} py="space.06">
      {direction.isDiscarded ? (
        <styled.p
          textStyle="body.02"
          p="space.03"
          borderRadius="sm"
          bg="yellow.background-primary"
          color="ink.text-primary"
        >
          {direction.label} is kept as a reference and discarded by default. {direction.summary}
        </styled.p>
      ) : null}
      {approvalSections.map(section => {
        const screens = approvalScreens.filter(screen => screen.section === section.id);
        if (screens.length === 0) return null;
        return (
          <Flex as="section" key={section.id} direction="column" gap="space.04">
            <styled.h2 textStyle="heading.04" color="ink.text-primary">
              {section.label}
            </styled.h2>
            <Grid
              gridTemplateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }}
              gap="space.04"
            >
              {screens.map(screen => (
                <ScreenCard key={screen.id} screen={screen} params={params} direction={direction} />
              ))}
            </Grid>
          </Flex>
        );
      })}
    </Flex>
  );
}
