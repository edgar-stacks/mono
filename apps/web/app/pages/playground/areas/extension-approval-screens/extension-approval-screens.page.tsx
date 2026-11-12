import { useState } from 'react';

import { Box, Flex, HStack, Stack, styled } from 'leather-styles/jsx';
import { type Token, token } from 'leather-styles/tokens';

import {
  type ApprovalAnswer,
  type ApprovalQuestionKey,
  type ApprovalScreen,
  type ApprovalScreenStatus,
  approvalLayouts,
  approvalQuestions,
  uncapturedScreens,
  usageEvents,
} from './extension-approval-screens.data';

const shotUrls = import.meta.glob<string>('./shots/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

const popupWidth = 390;
const dimmedOpacity = 0.2;

interface ChipColors {
  bg: Token;
  color: Token;
}

const answerColors: Record<ApprovalAnswer, ChipColors> = {
  yes: { bg: 'colors.green.background-secondary', color: 'colors.green.text-primary' },
  no: { bg: 'colors.red.background-secondary', color: 'colors.red.text-primary' },
  partial: { bg: 'colors.yellow.background-secondary', color: 'colors.yellow.text-primary' },
  'n.a.': { bg: 'colors.ink.component-background-default', color: 'colors.ink.text-subdued' },
};

const statusColors: Record<ApprovalScreenStatus, ChipColors> = {
  live: { bg: 'colors.green.background-secondary', color: 'colors.green.text-primary' },
  gated: { bg: 'colors.yellow.background-secondary', color: 'colors.yellow.text-primary' },
  deprecated: { bg: 'colors.red.background-secondary', color: 'colors.red.text-primary' },
};

function getShotUrl(shot: string) {
  return shotUrls[`./shots/${shot}.png`];
}

interface ChipProps {
  label: string;
  colors: ChipColors;
}
function Chip({ label, colors }: ChipProps) {
  return (
    <styled.span
      textStyle="label.03"
      px="space.02"
      py="1px"
      borderRadius="xs"
      whiteSpace="nowrap"
      style={{ background: token.var(colors.bg), color: token.var(colors.color) }}
    >
      {label}
    </styled.span>
  );
}

interface ScreenCardProps {
  screen: ApprovalScreen;
  isDimmed: boolean;
}
function ScreenCard({ screen, isDimmed }: ScreenCardProps) {
  const shotUrl = getShotUrl(screen.shot);
  return (
    <Stack
      gap="space.03"
      flexShrink={0}
      transition="opacity 0.2s"
      style={{ width: popupWidth, opacity: isDimmed ? dimmedOpacity : 1 }}
    >
      <HStack justifyContent="space-between" alignItems="baseline" gap="space.02">
        <styled.h3 textStyle="label.01">{screen.title}</styled.h3>
        <Chip label={screen.status} colors={statusColors[screen.status]} />
      </HStack>
      <styled.code textStyle="caption.01" color="ink.text-subdued">
        {screen.method}
      </styled.code>
      <Box
        border="1px solid"
        borderColor="ink.border-default"
        borderRadius="sm"
        overflow="hidden"
        bg="ink.background-secondary"
      >
        {shotUrl ? (
          <styled.img src={shotUrl} alt={screen.title} display="block" width="100%" />
        ) : (
          <styled.p p="space.05" textStyle="caption.01" color="ink.text-subdued">
            No screenshot yet. Run approval-screens.spec.ts to capture {screen.shot}.png.
          </styled.p>
        )}
      </Box>
      <styled.p textStyle="caption.01" color="ink.text-subdued">
        {screen.note}
      </styled.p>
      <Stack gap="space.01">
        {approvalQuestions.map(question => (
          <HStack key={question.key} justifyContent="space-between" gap="space.02">
            <styled.span textStyle="caption.01">{question.label}</styled.span>
            <Chip
              label={screen.answers[question.key]}
              colors={answerColors[screen.answers[question.key]]}
            />
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}

interface HighlightBarProps {
  highlighted: ApprovalQuestionKey | null;
  onHighlight(key: ApprovalQuestionKey | null): void;
}
function HighlightBar({ highlighted, onHighlight }: HighlightBarProps) {
  return (
    <Flex gap="space.02" flexWrap="wrap" alignItems="center">
      <styled.span textStyle="label.03" color="ink.text-subdued">
        Highlight screens that answer no:
      </styled.span>
      {approvalQuestions.map(question => {
        const isActive = highlighted === question.key;
        return (
          <styled.button
            key={question.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onHighlight(isActive ? null : question.key)}
            textStyle="label.03"
            px="space.03"
            py="space.01"
            border="1px solid"
            borderColor={isActive ? 'ink.text-primary' : 'ink.border-default'}
            bg={isActive ? 'ink.text-primary' : 'ink.background-primary'}
            color={isActive ? 'ink.background-primary' : 'ink.text-primary'}
            borderRadius="sm"
            cursor="pointer"
          >
            {question.label}
          </styled.button>
        );
      })}
    </Flex>
  );
}

interface MatrixProps {
  highlighted: ApprovalQuestionKey | null;
}
function Matrix({ highlighted }: MatrixProps) {
  const screens = approvalLayouts.flatMap(layout => layout.screens);
  return (
    <Box overflowX="auto">
      <styled.table textStyle="caption.01" borderCollapse="collapse">
        <thead>
          <tr>
            <styled.th textAlign="left" p="space.02">
              Screen
            </styled.th>
            {approvalQuestions.map(question => (
              <styled.th
                key={question.key}
                textAlign="left"
                p="space.02"
                style={{ opacity: highlighted && highlighted !== question.key ? dimmedOpacity : 1 }}
              >
                {question.label}
              </styled.th>
            ))}
          </tr>
        </thead>
        <tbody>
          {screens.map(screen => (
            <styled.tr
              key={screen.shot}
              borderTop="1px solid"
              borderColor="ink.border-default"
              style={{
                opacity: highlighted && screen.answers[highlighted] !== 'no' ? dimmedOpacity : 1,
              }}
            >
              <styled.td p="space.02" whiteSpace="nowrap">
                {screen.title}
              </styled.td>
              {approvalQuestions.map(question => (
                <styled.td key={question.key} p="space.02">
                  <Chip
                    label={screen.answers[question.key]}
                    colors={answerColors[screen.answers[question.key]]}
                  />
                </styled.td>
              ))}
            </styled.tr>
          ))}
        </tbody>
      </styled.table>
    </Box>
  );
}

export function ExtensionApprovalScreensPage() {
  const [highlighted, setHighlighted] = useState<ApprovalQuestionKey | null>(null);

  return (
    <Stack gap="space.09" p="space.07" pb="space.11">
      <Stack gap="space.03" maxWidth="80ch">
        <styled.h1 textStyle="heading.03">Extension approval screens</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Real screenshots of every dApp approval popup the extension ships, captured at 390×756 by
          apps/extension/tests/specs/screenshots/approval-screens.spec.ts through the real request
          containers. One strip per layout. For the same layouts rendered live from fixtures, open
          index.html#/approval-screens-preview in a development build of the extension.
        </styled.p>
      </Stack>

      <Box position="sticky" top={0} zIndex={1} bg="ink.background-primary" py="space.03">
        <HighlightBar highlighted={highlighted} onHighlight={setHighlighted} />
      </Box>

      {approvalLayouts.map(layout => (
        <Stack key={layout.id} gap="space.04">
          <Stack gap="space.02" maxWidth="80ch">
            <styled.h2 textStyle="heading.05">{layout.title}</styled.h2>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {layout.description}
            </styled.p>
          </Stack>
          <Flex gap="space.06" overflowX="auto" pb="space.04" alignItems="flex-start">
            {layout.screens.map(screen => (
              <ScreenCard
                key={screen.shot}
                screen={screen}
                isDimmed={highlighted !== null && screen.answers[highlighted] !== 'no'}
              />
            ))}
          </Flex>
        </Stack>
      ))}

      <Stack gap="space.04">
        <styled.h2 textStyle="heading.05">Matrix</styled.h2>
        <Matrix highlighted={highlighted} />
      </Stack>

      <Stack gap="space.03" maxWidth="80ch">
        <styled.h2 textStyle="heading.05">Not captured</styled.h2>
        {uncapturedScreens.map(screen => (
          <Stack key={screen.title} gap="space.01">
            <HStack gap="space.02">
              <styled.span textStyle="label.02">{screen.title}</styled.span>
              <styled.code textStyle="caption.01" color="ink.text-subdued">
                {screen.method}
              </styled.code>
              <Chip label={screen.status} colors={statusColors[screen.status]} />
            </HStack>
            <styled.p textStyle="caption.01" color="ink.text-subdued">
              {screen.reason}
            </styled.p>
          </Stack>
        ))}
      </Stack>

      <Stack gap="space.03" maxWidth="80ch">
        <styled.h2 textStyle="heading.05">Measuring real usage</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          These analytics events already exist and would show which of these screens people actually
          see.
        </styled.p>
        {usageEvents.map(event => (
          <Stack key={event.name} gap="space.01">
            <styled.code textStyle="label.02">{event.name}</styled.code>
            <styled.p textStyle="caption.01" color="ink.text-subdued">
              {event.description}
            </styled.p>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
