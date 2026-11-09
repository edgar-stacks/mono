import { type ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { SpendingSourcesApproval } from './spending-sources-approval';
import { mixedScenario, taprootAvoidableScenario } from './spending-sources.mock-data';

interface SectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <Stack gap="space.06">
      <Stack gap="space.02" maxWidth="70ch">
        <styled.h2 textStyle="heading.04">{title}</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {description}
        </styled.p>
      </Stack>
      <Flex gap="space.07" flexWrap="wrap" alignItems="flex-start">
        {children}
      </Flex>
    </Stack>
  );
}

interface BoardProps {
  label: string;
  note: string;
  children: ReactNode;
}

function Board({ label, note, children }: BoardProps) {
  return (
    <Stack gap="space.03" width="392px">
      <Stack gap="space.01">
        <styled.h3 textStyle="label.02">{label}</styled.h3>
        <styled.p
          textStyle="caption.01"
          color="ink.text-subdued"
          borderLeft="default"
          pl="space.03"
        >
          {note}
        </styled.p>
      </Stack>
      {children}
    </Stack>
  );
}

export function SpendingSourcesPage() {
  return (
    <Stack gap="space.11" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Spending sources</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Proposal for showing, and letting users limit, which address types a sendTransfer request
          spends from. A dapp such as the sBTC bridge only asks for an amount, so largest-first coin
          selection can reach into Taproot coins that may carry inscriptions or runes. Each board is
          the approval rebuilt from the real Approver components with mock coins and live coin
          selection.
        </styled.p>
        <styled.p textStyle="caption.01" color="ink.text-subdued">
          Mock mainnet data · no wallet · 5 sat/vB fee rate
        </styled.p>
      </Stack>

      <Section
        title="Approval screen"
        description="Taproot is kept out whenever Native SegWit alone covers amount plus fee. When Taproot has to be spent, a warning says so and You'll send breaks the spend down per address type."
      >
        <Board
          label="Native SegWit covers it"
          note="Native SegWit holds enough, so Taproot stays out by default and the approval looks like today's, plus an Edit sources action. Switch Taproot on and apply to see the warning come back."
        >
          <SpendingSourcesApproval scenario={taprootAvoidableScenario} />
        </Board>
        <Board
          label="Mixed address types"
          note="Native SegWit alone falls short, so some Taproot coins are spent. The account caption reads Multiple address types and the spend is broken down per type."
        >
          <SpendingSourcesApproval scenario={mixedScenario} />
        </Board>
      </Section>

      <Section
        title="Edit sources sheet"
        description="A switch per address type. A type the transfer cannot do without is locked on; when that type is Taproot, the sheet explains how to keep those coins untouched."
      >
        <Board
          label="Taproot needed"
          note="Both switches are locked on: neither address type covers the transfer alone."
        >
          <SpendingSourcesApproval scenario={mixedScenario} isSheetOpenOnMount />
        </Board>
        <Board
          label="Taproot switched back on"
          note="Native SegWit is locked on because Taproot alone cannot cover it; Taproot was switched back on and can be switched off again."
        >
          <SpendingSourcesApproval
            scenario={taprootAvoidableScenario}
            initialAllowed={['nativeSegwit', 'taproot']}
            isSheetOpenOnMount
          />
        </Board>
      </Section>
    </Stack>
  );
}
