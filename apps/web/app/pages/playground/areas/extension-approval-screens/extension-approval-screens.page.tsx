import { type ReactNode, useState } from 'react';

import { css } from 'leather-styles/css';
import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import {
  type Answer,
  type ApprovalScreen,
  type QuestionId,
  type ScreenStatus,
  approvalLayouts,
  approvalQuestions,
  approvalScreens,
  uncapturedScreens,
  usageEvents,
} from './extension-approval-screens.data';

const shotUrls = import.meta.glob<string>('./shots/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

const shotWidth = 390;
const dimmedOpacity = 0.2;

const answerStyles: Record<Answer, string> = {
  yes: css({ bg: 'green.background-primary', color: 'green.text-secondary' }),
  no: css({ bg: 'red.background-primary', color: 'red.action-primary-default' }),
  partial: css({ bg: 'yellow.background-primary', color: 'ink.text-primary' }),
  'n.a.': css({ bg: 'ink.component-background-default', color: 'ink.text-subdued' }),
};

const statusStyles: Record<ScreenStatus, string> = {
  live: css({ bg: 'green.background-primary', color: 'green.text-secondary' }),
  gated: css({ bg: 'yellow.background-primary', color: 'ink.text-primary' }),
  deprecated: css({ bg: 'red.background-primary', color: 'red.action-primary-default' }),
};

interface ChipProps {
  className: string;
  children: ReactNode;
}
function Chip({ className, children }: ChipProps) {
  return (
    <styled.span
      className={className}
      textStyle="caption.02"
      px="space.02"
      py="1px"
      borderRadius="xs"
      whiteSpace="nowrap"
    >
      {children}
    </styled.span>
  );
}

interface AnswerChipProps {
  answer: Answer;
}
function AnswerChip({ answer }: AnswerChipProps) {
  return <Chip className={answerStyles[answer]}>{answer}</Chip>;
}

interface StatusChipProps {
  status: ScreenStatus;
}
function StatusChip({ status }: StatusChipProps) {
  return <Chip className={statusStyles[status]}>{status}</Chip>;
}

function isDimmed(screen: ApprovalScreen, highlighted: QuestionId | null) {
  return highlighted !== null && screen.answers[highlighted] !== 'no';
}

interface ScreenCardProps {
  screen: ApprovalScreen;
  highlighted: QuestionId | null;
}
function ScreenCard({ screen, highlighted }: ScreenCardProps) {
  const url = shotUrls[`./shots/${screen.shot}`];

  return (
    <Stack
      gap="space.03"
      flexShrink={0}
      style={{ width: shotWidth, opacity: isDimmed(screen, highlighted) ? dimmedOpacity : 1 }}
    >
      <Stack gap="space.01">
        <Flex alignItems="baseline" gap="space.02" flexWrap="wrap">
          <styled.h3 textStyle="label.02">{screen.name}</styled.h3>
          <StatusChip status={screen.status} />
        </Flex>
        <styled.code textStyle="caption.02" color="ink.text-subdued">
          {screen.method}
        </styled.code>
      </Stack>
      <styled.p textStyle="caption.01" color="ink.text-subdued" borderLeft="default" pl="space.03">
        {screen.note}
      </styled.p>
      <Stack gap="space.01">
        {approvalQuestions.map(question => (
          <Flex key={question.id} justifyContent="space-between" gap="space.03">
            <styled.span textStyle="caption.01">{question.label}</styled.span>
            <AnswerChip answer={screen.answers[question.id]} />
          </Flex>
        ))}
      </Stack>
      {url ? (
        <styled.img
          src={url}
          alt={`${screen.name} approval screen`}
          style={{ width: shotWidth }}
          borderWidth={1}
          borderColor="ink.border-default"
          borderRadius="md"
        />
      ) : (
        <styled.p textStyle="caption.01" color="red.action-primary-default">
          Missing shots/{screen.shot}: run approval-screens.spec.ts
        </styled.p>
      )}
    </Stack>
  );
}

interface SectionProps {
  title: string;
  description: string;
  children: ReactNode;
}
function Section({ title, description, children }: SectionProps) {
  return (
    <Stack gap="space.05">
      <Stack gap="space.02" maxWidth="70ch">
        <styled.h2 textStyle="heading.04">{title}</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {description}
        </styled.p>
      </Stack>
      {children}
    </Stack>
  );
}

interface HighlightBarProps {
  highlighted: QuestionId | null;
  onHighlight(question: QuestionId | null): void;
}
function HighlightBar({ highlighted, onHighlight }: HighlightBarProps) {
  return (
    <Flex gap="space.02" flexWrap="wrap" alignItems="center">
      <styled.span textStyle="label.03" color="ink.text-subdued">
        Highlight the screens that answer no:
      </styled.span>
      {approvalQuestions.map(question => {
        const isActive = highlighted === question.id;
        return (
          <styled.button
            key={question.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onHighlight(isActive ? null : question.id)}
            textStyle="caption.01"
            px="space.03"
            py="space.01"
            borderWidth={1}
            borderColor="ink.border-default"
            borderRadius="sm"
            cursor="pointer"
            bg={isActive ? 'ink.text-primary' : 'ink.background-primary'}
            color={isActive ? 'ink.background-primary' : 'ink.text-primary'}
          >
            {question.label}
          </styled.button>
        );
      })}
      {highlighted && (
        <styled.button
          type="button"
          onClick={() => onHighlight(null)}
          textStyle="caption.01"
          color="ink.text-subdued"
          textDecoration="underline"
          cursor="pointer"
          bg="transparent"
        >
          Clear
        </styled.button>
      )}
    </Flex>
  );
}

interface MatrixProps {
  highlighted: QuestionId | null;
}
function Matrix({ highlighted }: MatrixProps) {
  return (
    <Box overflowX="auto">
      <styled.table textStyle="caption.01" borderCollapse="collapse">
        <thead>
          <tr>
            <styled.th textAlign="left" p="space.02">
              Screen
            </styled.th>
            <styled.th textAlign="left" p="space.02">
              Status
            </styled.th>
            {approvalQuestions.map(question => (
              <styled.th key={question.id} textAlign="left" p="space.02" maxWidth="120px">
                {question.label}
              </styled.th>
            ))}
          </tr>
        </thead>
        <tbody>
          {approvalScreens.map(screen => (
            <styled.tr
              key={screen.id}
              borderTopWidth={1}
              borderColor="ink.border-default"
              style={{ opacity: isDimmed(screen, highlighted) ? dimmedOpacity : 1 }}
            >
              <styled.td p="space.02" whiteSpace="nowrap">
                {screen.name}
              </styled.td>
              <styled.td p="space.02">
                <StatusChip status={screen.status} />
              </styled.td>
              {approvalQuestions.map(question => (
                <styled.td key={question.id} p="space.02">
                  <AnswerChip answer={screen.answers[question.id]} />
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
  const [highlighted, setHighlighted] = useState<QuestionId | null>(null);

  return (
    <Stack gap="space.09" p="space.07" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Extension approval screens</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Every dApp approval screen the extension ships, captured from a test build at 390×756 by
          apps/extension/tests/specs/screenshots/approval-screens.spec.ts, which sends each request
          through the test app and saves the popup. Rerun that spec to refresh the shots. The live
          counterpart, with the same layout components on hand-written props, is the extension page
          #/approval-screens-preview in development and test builds.
        </styled.p>
      </Stack>

      <HighlightBar highlighted={highlighted} onHighlight={setHighlighted} />

      {approvalLayouts.map(layout => (
        <Section key={layout.id} title={layout.title} description={layout.description}>
          <Flex gap="space.06" overflowX="auto" pb="space.04" alignItems="flex-start">
            {approvalScreens
              .filter(screen => screen.layout === layout.id)
              .map(screen => (
                <ScreenCard key={screen.id} screen={screen} highlighted={highlighted} />
              ))}
          </Flex>
        </Section>
      ))}

      <Section
        title="Matrix"
        description="Every screen against the six questions. The Highlight buttons above dim every row and every screen except those that answer no."
      >
        <Matrix highlighted={highlighted} />
      </Section>

      <Section title="Not captured" description="Screens the spec cannot reach yet, and why.">
        <Stack gap="space.03">
          {uncapturedScreens.map(screen => (
            <Flex key={screen.method} gap="space.03" alignItems="baseline" flexWrap="wrap">
              <styled.code textStyle="label.03">{screen.method}</styled.code>
              <StatusChip status={screen.status} />
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {screen.reason}
              </styled.span>
            </Flex>
          ))}
        </Stack>
      </Section>

      <Section
        title="Measuring real usage"
        description="Analytics events that already exist and would show how often each screen is reached."
      >
        <Stack gap="space.03">
          {usageEvents.map(event => (
            <Flex key={event.name} gap="space.03" alignItems="baseline" flexWrap="wrap">
              <styled.code textStyle="label.03">{event.name}</styled.code>
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {event.description}
              </styled.span>
            </Flex>
          ))}
        </Stack>
      </Section>
    </Stack>
  );
}
