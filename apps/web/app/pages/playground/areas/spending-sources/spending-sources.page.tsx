import { Stack, styled } from 'leather-styles/jsx';

import { Board, Section } from '../staking-states/staking-surface';
import { SpendingSourcesApproval } from './spending-sources-approval';
import { mixedScenario, taprootAvoidableScenario } from './spending-sources.mock-data';

export function SpendingSourcesPage() {
  return (
    <Stack gap="space.11" px="space.07" py="space.09" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Spending sources</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Prototype for showing which address types a sendTransfer approval spends from. A dapp such
          as the sBTC bridge asks for an amount, and largest-first coin selection can reach into
          Taproot coins that may carry inscriptions or runes. The approval is rebuilt from the real
          Approver components with mock coins and live coin selection, so every board here is
          interactive.
        </styled.p>
        <styled.p textStyle="caption.01" color="ink.text-subdued">
          Mock mainnet data · no wallet · 0.00442000 BTC requested by sbtc.stacks.co
        </styled.p>
      </Stack>

      <Section
        title="Approval screen"
        description="Taproot is kept out by default whenever Native SegWit alone covers the amount plus fee. When Taproot has to be spent, the approval says so up front and breaks the spend down per address type."
      >
        <Stack gap="space.07">
          <Board
            label="Native SegWit covers it"
            note="Native SegWit holds enough, so Taproot stays out and the approval looks like today's, plus an Edit sources action in the You'll send header. Switch Taproot on in the sheet and apply to see the warning and breakdown come back."
          >
            <SpendingSourcesApproval scenario={taprootAvoidableScenario} />
          </Board>
          <Board
            label="Mixed address types"
            note="Native SegWit alone falls short, so some Taproot coins are spent. A warning callout leads the approval, the account caption reads Multiple address types and You'll send breaks the spend down per type."
          >
            <SpendingSourcesApproval scenario={mixedScenario} />
          </Board>
        </Stack>
      </Section>

      <Section
        title="Edit sources sheet"
        description="One switch per address type, with what each holds. A type the transfer cannot do without is locked on, and the totals update live as the switches change."
      >
        <Stack gap="space.07">
          <Board
            label="Taproot needed"
            note="Both types are needed to cover this transfer, so both switches are locked and a red callout explains how to keep Taproot coins untouched: go back to the app and ask for less."
          >
            <SpendingSourcesApproval scenario={mixedScenario} openSheetOnMount />
          </Board>
          <Board
            label="Taproot switched back on"
            note="Taproot is optional here. With it switched back on, largest-first selection reaches for the large Taproot coin, and applying brings back the warning and the per-type breakdown."
          >
            <SpendingSourcesApproval
              scenario={taprootAvoidableScenario}
              openSheetOnMount
              sheetInitialAllowed={['nativeSegwit', 'taproot']}
            />
          </Board>
        </Stack>
      </Section>
    </Stack>
  );
}
