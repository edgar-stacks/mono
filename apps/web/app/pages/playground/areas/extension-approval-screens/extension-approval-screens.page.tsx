import { useState } from 'react';

import { css } from 'leather-styles/css';
import { Box, Flex, Grid, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  type ApprovalAnswer,
  type ApprovalQuestionId,
  type ApprovalScreen,
  type ApprovalScreenStatus,
  approvalAnalyticsEvents,
  approvalLayouts,
  approvalQuestions,
  uncapturedApprovalScreens,
} from './extension-approval-screens.data';

const shotUrls = import.meta.glob<string>('./shots/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

function getShotUrl(shot: string) {
  return shotUrls[`./shots/${shot}.png`];
}

const answerClassNames: Record<ApprovalAnswer, string> = {
  yes: css({ bg: 'green.background-primary', color: 'green.action-primary-default' }),
  no: css({ bg: 'red.background-primary', color: 'red.action-primary-default' }),
  partial: css({ bg: 'yellow.background-primary', color: 'ink.text-primary' }),
  'n.a.': css({ bg: 'ink.component-background-default', color: 'ink.text-subdued' }),
};

const statusClassNames: Record<ApprovalScreenStatus, string> = {
  live: css({ bg: 'green.background-primary', color: 'green.action-primary-default' }),
  gated: css({ bg: 'yellow.background-primary', color: 'ink.text-primary' }),
  deprecated: css({ bg: 'red.background-primary', color: 'red.action-primary-default' }),
};

const screenFrameWidth = '390px';

interface ChipProps {
  label: string;
  className: string;
}
function Chip({ label, className }: ChipProps) {
  return (
    <styled.span
      className={className}
      display="inline-block"
      px="space.02"
      py="space.00"
      borderRadius="xs"
      textStyle="label.03"
      whiteSpace="nowrap"
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
      width={screenFrameWidth}
      flexShrink={0}
      opacity={isDimmed ? 0.2 : 1}
      data-screen={screen.shot}
    >
      <Stack gap="space.01">
        <Flex gap="space.02" alignItems="center">
          <styled.h3 textStyle="label.01">{screen.title}</styled.h3>
          <Chip label={screen.status} className={statusClassNames[screen.status]} />
        </Flex>
        <styled.code textStyle="caption.01" color="ink.text-subdued">
          {screen.method}
        </styled.code>
      </Stack>
      <styled.p textStyle="caption.01" minHeight="64px">
        {screen.note}
      </styled.p>
      <Stack gap="space.01">
        {approvalQuestions.map(question => (
          <Flex key={question.id} justifyContent="space-between" gap="space.02">
            <styled.span textStyle="caption.02" color="ink.text-subdued">
              {question.label}
            </styled.span>
            <Chip
              label={screen.answers[question.id]}
              className={answerClassNames[screen.answers[question.id]]}
            />
          </Flex>
        ))}
      </Stack>
      <Box border="1px solid" borderColor="ink.border-default">
        {shotUrl ? (
          <styled.img src={shotUrl} alt={screen.title} width="100%" display="block" />
        ) : (
          <styled.p p="space.04" textStyle="caption.01" color="ink.text-subdued">
            No screenshot yet. Run the approval-screens spec in apps/extension.
          </styled.p>
        )}
      </Box>
    </Stack>
  );
}

interface HighlightControlsProps {
  highlighted: ApprovalQuestionId | null;
  onHighlight(question: ApprovalQuestionId | null): void;
}
function HighlightControls({ highlighted, onHighlight }: HighlightControlsProps) {
  return (
    <Flex gap="space.02" flexWrap="wrap" alignItems="center">
      <styled.span textStyle="label.02">Highlight screens that answer no:</styled.span>
      {approvalQuestions.map(question => (
        <Button
          key={question.id}
          size="sm"
          variant={highlighted === question.id ? 'solid' : 'outline'}
          onClick={() => onHighlight(highlighted === question.id ? null : question.id)}
        >
          {question.label}
        </Button>
      ))}
      {highlighted && (
        <Button size="sm" variant="ghost" onClick={() => onHighlight(null)}>
          Clear
        </Button>
      )}
    </Flex>
  );
}

function isScreenDimmed(screen: ApprovalScreen, highlighted: ApprovalQuestionId | null) {
  if (!highlighted) return false;
  return screen.answers[highlighted] !== 'no';
}

const allScreens = approvalLayouts.flatMap(layout => layout.screens);

interface AnswerMatrixProps {
  highlighted: ApprovalQuestionId | null;
}
function AnswerMatrix({ highlighted }: AnswerMatrixProps) {
  return (
    <Box overflowX="auto">
      <styled.table textStyle="caption.01" borderCollapse="collapse">
        <thead>
          <tr>
            <styled.th textAlign="left" p="space.02">
              Screen
            </styled.th>
            {approvalQuestions.map(question => (
              <styled.th key={question.id} textAlign="left" p="space.02" maxWidth="120px">
                {question.label}
              </styled.th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allScreens.map(screen => (
            <styled.tr
              key={screen.shot}
              borderTop="1px solid"
              borderColor="ink.border-default"
              opacity={isScreenDimmed(screen, highlighted) ? 0.2 : 1}
            >
              <styled.td p="space.02" whiteSpace="nowrap">
                {screen.title}
              </styled.td>
              {approvalQuestions.map(question => (
                <styled.td key={question.id} p="space.02">
                  <Chip
                    label={screen.answers[question.id]}
                    className={answerClassNames[screen.answers[question.id]]}
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
  const [highlighted, setHighlighted] = useState<ApprovalQuestionId | null>(null);

  return (
    <Stack gap="space.08" p="space.07" bg="ink.background-primary" minHeight="100vh">
      <Stack gap="space.03" maxWidth="760px">
        <styled.h1 textStyle="heading.03">Extension approval screens</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Every dApp approval screen the extension shows, captured from a test build at 390×756 by
          apps/extension/tests/specs/screenshots/approval-screens.spec.ts, one strip per layout.
          Rerun the spec to refresh the shots. For a live view of the same layout components with
          fixture props, open index.html#/approval-screens-preview in a development build.
        </styled.p>
      </Stack>

      <Stack
        gap="space.04"
        position="sticky"
        top="0"
        zIndex={1}
        bg="ink.background-primary"
        py="space.03"
      >
        <HighlightControls highlighted={highlighted} onHighlight={setHighlighted} />
      </Stack>

      {approvalLayouts.map(layout => (
        <Stack key={layout.id} gap="space.04">
          <Stack gap="space.01" maxWidth="760px">
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
                isDimmed={isScreenDimmed(screen, highlighted)}
              />
            ))}
          </Flex>
        </Stack>
      ))}

      <Stack gap="space.04">
        <styled.h2 textStyle="heading.05">Matrix</styled.h2>
        <AnswerMatrix highlighted={highlighted} />
      </Stack>

      <Grid gap="space.06" gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }} maxWidth="1200px">
        <Stack gap="space.03">
          <styled.h2 textStyle="heading.05">Not captured</styled.h2>
          {uncapturedApprovalScreens.map(screen => (
            <Stack key={screen.method} gap="space.01">
              <Flex gap="space.02" alignItems="center">
                <styled.span textStyle="label.02">{screen.title}</styled.span>
                <Chip label={screen.status} className={statusClassNames[screen.status]} />
              </Flex>
              <styled.code textStyle="caption.01" color="ink.text-subdued">
                {screen.method}
              </styled.code>
              <styled.p textStyle="caption.01">{screen.reason}</styled.p>
            </Stack>
          ))}
        </Stack>
        <Stack gap="space.03">
          <styled.h2 textStyle="heading.05">Measuring real usage</styled.h2>
          <styled.p textStyle="body.02">
            The background script already sends rpc_request_successful when a request opens its
            approval window and rpc_request_error when it fails validation, both with the RPC method
            as endpoint, so how often each screen is shown can be read from them:
          </styled.p>
          <Flex gap="space.02" flexWrap="wrap">
            {approvalAnalyticsEvents.map(event => (
              <styled.code key={event} textStyle="caption.01">
                {event}
              </styled.code>
            ))}
          </Flex>
        </Stack>
      </Grid>
    </Stack>
  );
}
