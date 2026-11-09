import { Link, useNavigate, useSearchParams } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-registry';
import { journeyFamilies } from '../journeys/journey-definitions';
import { createRunId, prototypeUrl, viewUrl } from '../journeys/journey-navigation';
import { approvalSections } from '../scenarios/approval-scenario.types';
import { type ApprovalScreenEntry, approvalScreens } from '../scenarios/approval-screens';
import { canvasButton } from './canvas-styles';
import { CaptureFrame } from './capture-frame';
import { ExtensionFrame } from './extension-frame';
import { ScreenPreview } from './screen-preview';

function sectionOf(entry: ApprovalScreenEntry) {
  return journeyFamilies.find(family => family.id === entry.familyId)?.section;
}

interface ScreenCardProps {
  entry: ApprovalScreenEntry;
  direction: ApprovalDirection;
}

function ScreenCard({ entry, direction }: ScreenCardProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const family = journeyFamilies.find(candidate => candidate.id === entry.familyId);

  function launchPrototype() {
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
    <Flex
      id={entry.id}
      direction="column"
      gap="space.04"
      p={{ base: 'space.03', md: 'space.05' }}
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-transparent"
      bg="ink.background-secondary"
    >
      <Flex direction={{ base: 'column', md: 'row' }} justifyContent="space-between" gap="space.03">
        <Flex direction="column" gap="space.01">
          <styled.h3 textStyle="label.01" color="ink.text-primary">
            {family?.title}
            {entry.wallet === 'ledger' ? ' · Ledger' : null}
          </styled.h3>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {entry.note}
          </styled.p>
        </Flex>
        <Flex gap="space.02" alignItems="flex-start" flexWrap="wrap">
          <Link to={viewUrl(searchParams, 'viewer', { screen: entry.id })} className={canvasButton}>
            Open
          </Link>
          <button type="button" onClick={launchPrototype} className={canvasButton}>
            Launch prototype
          </button>
        </Flex>
      </Flex>
      <Flex gap="space.05" overflowX="auto" pb="space.02">
        <ExtensionFrame label={`Proposed · ${direction.label}`}>
          <ScreenPreview entry={entry} direction={direction} />
        </ExtensionFrame>
        <CaptureFrame screenId={entry.id} />
      </Flex>
    </Flex>
  );
}

interface ScreenCatalogProps {
  direction: ApprovalDirection;
}

export function ScreenCatalog({ direction }: ScreenCatalogProps) {
  return (
    <Flex direction="column" gap="space.08" px={{ base: 'space.03', md: 'space.06' }} py="space.06">
      <Flex direction="column" gap="space.02" maxWidth="720px">
        <styled.h2 textStyle="heading.04" color="ink.text-primary">
          Approval screens
        </styled.h2>
        <styled.p textStyle="body.01" color="ink.text-subdued">
          Each proposed screen sits next to the current extension at popup size. Can you tell who
          asks, which account or vault signs, what moves, what it costs and what is enforced?
          Everything here uses illustrative fixtures.
        </styled.p>
      </Flex>
      {approvalSections.map(section => {
        const entries = approvalScreens.filter(entry => sectionOf(entry) === section.id);
        if (entries.length === 0) return null;
        return (
          <Flex key={section.id} direction="column" gap="space.04">
            <styled.h2 textStyle="heading.05" color="ink.text-primary">
              {section.label}
            </styled.h2>
            {entries.map(entry => (
              <ScreenCard key={entry.id} entry={entry} direction={direction} />
            ))}
          </Flex>
        );
      })}
    </Flex>
  );
}
