import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { CanvasLink } from '../canvas/canvas-link';
import type { SignerKind } from '../scenarios/approval-model';
import { type JourneyDefinition, findJourney, journeyDefinitions } from './journey-definitions';
import { catalogReturnUrl, createRunId, prototypeUrl } from './journey-navigation';
import { walletShapes } from './journey-world';

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
  maxWidth: '100%',
} as const;

const journeyGroups = [...new Set(journeyDefinitions.map(journey => journey.group))];

interface JourneyStripProps {
  params: URLSearchParams;
  journey: JourneyDefinition;
  variantId: string;
  wallet: SignerKind;
  participant: boolean;
  controlsOpen: boolean;
  onToggleControls(): void;
}

export function JourneyStrip({
  params,
  journey,
  variantId,
  wallet,
  participant,
  controlsOpen,
  onToggleControls,
}: JourneyStripProps) {
  const navigate = useNavigate();

  function switchTo(target: { journey: string; variant: string; wallet?: string }) {
    void navigate(prototypeUrl(params, target, createRunId()));
  }

  return (
    <Flex
      alignItems="center"
      gap="space.02"
      flexWrap="wrap"
      px="space.03"
      py="space.02"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-transparent"
      bg="ink.background-primary"
    >
      {participant ? null : (
        <CanvasLink to={catalogReturnUrl(params.get('return'))}>Screens</CanvasLink>
      )}
      <styled.select
        {...selectStyles}
        aria-label="Scenario"
        value={journey.id}
        onChange={event => {
          const next = findJourney(event.target.value);
          switchTo({ journey: next.id, variant: next.variants[0].id });
        }}
      >
        {journeyGroups.map(group => (
          <optgroup key={group} label={group}>
            {journeyDefinitions
              .filter(candidate => candidate.group === group)
              .map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
          </optgroup>
        ))}
      </styled.select>
      {journey.variants.length > 1 ? (
        <styled.select
          {...selectStyles}
          aria-label="Variant"
          value={variantId}
          onChange={event => switchTo({ journey: journey.id, variant: event.target.value })}
        >
          {journey.variants.map(variant => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </styled.select>
      ) : null}
      <styled.select
        {...selectStyles}
        aria-label="Wallet"
        value={wallet}
        onChange={event =>
          switchTo({ journey: journey.id, variant: variantId, wallet: event.target.value })
        }
      >
        {walletShapes.map(shape => (
          <option key={shape.id} value={shape.id}>
            {shape.label}
          </option>
        ))}
      </styled.select>
      {participant ? null : (
        <styled.button
          type="button"
          onClick={onToggleControls}
          aria-expanded={controlsOpen}
          ml="auto"
          textStyle="label.03"
          px="space.03"
          py="space.01"
          borderRadius="round"
          bg={controlsOpen ? 'ink.text-primary' : 'transparent'}
          color={controlsOpen ? 'ink.background-primary' : 'ink.text-primary'}
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
          cursor="pointer"
        >
          Controls
        </styled.button>
      )}
    </Flex>
  );
}
