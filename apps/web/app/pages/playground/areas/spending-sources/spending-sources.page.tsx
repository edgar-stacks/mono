import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Board, Section } from '../staking-states/staking-surface';
import { SpendingSourcesPreview } from './spending-sources-preview';
import { mixedScenario, taprootAvoidableScenario } from './spending-sources.mock-data';

interface BoardRowProps {
  children: ReactNode;
}

function BoardRow({ children }: BoardRowProps) {
  return (
    <Flex gap="space.07" flexWrap="wrap" alignItems="flex-start">
      {children}
    </Flex>
  );
}

export function SpendingSourcesPage() {
  return (
    <Stack gap="space.11" px="space.07" pt="space.09" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Spending sources</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Prototype for showing, and letting people choose, which address types a sendTransfer
          approval spends from. A dapp such as the sBTC bridge only asks for an amount, so
          largest-first coin selection can reach into Taproot coins that may carry inscriptions or
          runes. These boards rebuild the extension approval from the real Approver components with
          mock coins and live largest-first coin selection.
        </styled.p>
        <styled.p textStyle="caption.01" color="ink.text-subdued">
          Mock mainnet data · no wallet · 442,000 sats to an sBTC deposit address · 5 sat/vB
        </styled.p>
      </Stack>

      <Section
        title="Approval screen"
        description="Taproot stays out whenever Native SegWit alone covers the amount plus the fee. When Taproot has to be spent, a warning names it and You'll send breaks the spend down per address type."
      >
        <BoardRow>
          <Board
            label="Native SegWit covers it"
            note="Native SegWit holds 500,000 sats, enough on its own, so Taproot is kept out and the screen reads like today's approval plus an Edit sources action. Switch Taproot on and apply to see the largest-first selection reach for the 350,000 sat Taproot coin."
          >
            <SpendingSourcesPreview scenario={taprootAvoidableScenario} />
          </Board>
          <Board
            label="Mixed address types"
            note="Native SegWit holds 412,000 sats, short of the transfer, so Taproot coins are needed. The account caption reads Multiple address types and the spend is broken down per type."
          >
            <SpendingSourcesPreview scenario={mixedScenario} />
          </Board>
        </BoardRow>
      </Section>

      <Section
        title="Edit sources sheet"
        description="Edit sources opens a sheet with a switch per address type. A type the transfer cannot do without is locked on, and the totals update as the switches change."
      >
        <BoardRow>
          <Board
            label="Taproot needed"
            note="Both address types are locked on because neither covers the transfer alone. The red callout explains how to keep Taproot coins untouched: go back to the app and ask for less."
          >
            <SpendingSourcesPreview scenario={mixedScenario} isSheetOpenOnMount />
          </Board>
          <Board
            label="Taproot switched back on"
            note="Taproot was turned back on although Native SegWit covers the transfer. Native SegWit stays locked on, Taproot can be switched off again before applying."
          >
            <SpendingSourcesPreview
              scenario={taprootAvoidableScenario}
              initialAllowed={['nativeSegwit', 'taproot']}
              isSheetOpenOnMount
            />
          </Board>
        </BoardRow>
      </Section>
    </Stack>
  );
}
