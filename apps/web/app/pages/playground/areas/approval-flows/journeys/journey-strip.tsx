import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  type JourneyDefinition,
  type JourneyVariant,
  journeyDefinitions,
} from './journey-definitions';
import { catalogReturnUrl, createRunId, prototypeUrl, withParam } from './journey-navigation';

export type JourneyTab = 'app' | 'activity';

interface JourneyStripProps {
  params: URLSearchParams;
  definition: JourneyDefinition;
  variant: JourneyVariant;
  isParticipant: boolean;
  controlsOpen: boolean;
  tab: JourneyTab;
  onTab(tab: JourneyTab): void;
}

export function JourneyStrip({
  params,
  definition,
  variant,
  isParticipant,
  controlsOpen,
  tab,
  onTab,
}: JourneyStripProps) {
  const navigate = useNavigate();

  function switchJourney(journeyId: string, variantId: string) {
    void navigate(prototypeUrl(params, { journeyId, variantId }, createRunId()));
  }

  return (
    <Flex
      alignItems="center"
      gap="space.02"
      px="space.03"
      py="space.02"
      flexWrap="wrap"
      bg="ink.background-primary"
      borderBottomWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      data-journey-strip
    >
      <styled.label display="flex" alignItems="center" gap="space.01">
        <styled.span srOnly>Scenario</styled.span>
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
          value={definition.id}
          onChange={event => {
            const next = journeyDefinitions.find(candidate => candidate.id === event.target.value);
            if (next) switchJourney(next.id, next.variants[0].id);
          }}
        >
          {journeyDefinitions.map(candidate => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </styled.select>
      </styled.label>
      {definition.variants.length > 1 ? (
        <Flex gap="space.01" flexWrap="wrap" role="group" aria-label="Variant">
          {definition.variants.map(candidate => (
            <styled.button
              key={candidate.id}
              type="button"
              aria-pressed={candidate.id === variant.id}
              onClick={() => switchJourney(definition.id, candidate.id)}
              textStyle="caption.01"
              px="space.02"
              py="space.01"
              borderRadius="round"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="ink.border-default"
              color={candidate.id === variant.id ? 'ink.background-primary' : 'ink.text-primary'}
              bg={candidate.id === variant.id ? 'ink.text-primary' : 'transparent'}
            >
              {candidate.label}
            </styled.button>
          ))}
        </Flex>
      ) : null}
      <Flex gap="space.01" ml="auto" alignItems="center" flexWrap="wrap">
        <Flex role="tablist" aria-label="Surface" gap="space.01">
          <Button
            size="sm"
            variant={tab === 'app' ? 'solid' : 'ghost'}
            role="tab"
            aria-selected={tab === 'app'}
            onClick={() => onTab('app')}
          >
            App
          </Button>
          <Button
            size="sm"
            variant={tab === 'activity' ? 'solid' : 'ghost'}
            role="tab"
            aria-selected={tab === 'activity'}
            onClick={() => onTab('activity')}
          >
            Activity
          </Button>
        </Flex>
        {isParticipant ? null : (
          <>
            <Button
              size="sm"
              variant="outline"
              aria-expanded={controlsOpen}
              onClick={() =>
                void navigate(withParam(params, 'controls', controlsOpen ? null : 'open'))
              }
            >
              Controls
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigate(catalogReturnUrl(params.get('return')))}
            >
              Screens
            </Button>
          </>
        )}
      </Flex>
    </Flex>
  );
}
