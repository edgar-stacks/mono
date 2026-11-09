import { Grid, Stack, styled } from 'leather-styles/jsx';

import { Board, Section } from '../staking-states/staking-surface';
import { SpendingSourcesApproval } from './spending-sources-approval';
import { mixedScenario, taprootAvoidableScenario } from './spending-sources-mock-data';

const boardColumns = 'repeat(auto-fill, 440px)';

export function SpendingSourcesPage() {
  return (
    <Stack gap="space.11" px="space.07" pt="space.09" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Spending sources</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Prototype for showing which address types a sendTransfer approval spends from. Coin
          selection runs live, largest coin first, on mock mainnet coins for a 0.00442 BTC sBTC
          deposit requested by sbtc.stacks.co. Taproot stays out whenever Native SegWit alone covers
          the amount plus fee, and Edit sources lets the user decide the rest.
        </styled.p>
      </Stack>

      <Section
        title="Approval screen"
        description="The approval rebuilt from Approver: header, With account, You'll send and To address. Edit sources sits in the You'll send header on every board."
      >
        <Grid gap="space.07" gridTemplateColumns={boardColumns} alignItems="start">
          <Board
            label="Native SegWit covers it"
            note="Native SegWit holds enough for the amount plus fee, so Taproot is kept out by default and the approval reads like today's. Switch Taproot on in Edit sources and apply to see the warning and breakdown return."
          >
            <SpendingSourcesApproval scenario={taprootAvoidableScenario} />
          </Board>
          <Board
            label="Mixed address types"
            note="Native SegWit alone falls short, so the spend reaches into Taproot. A warning callout leads to Edit sources, the account caption reads Multiple address types and You'll send breaks the spend down per type."
          >
            <SpendingSourcesApproval scenario={mixedScenario} />
          </Board>
        </Grid>
      </Section>

      <Section
        title="Edit sources sheet"
        description="A bottom sheet with a switch per address type. A type the transfer cannot do without is locked on, and the totals update as switches change."
      >
        <Grid gap="space.07" gridTemplateColumns={boardColumns} alignItems="start">
          <Board
            label="Taproot needed"
            note="Neither address type covers the transfer alone, so both switches are locked on and a red callout explains how to keep Taproot coins untouched."
          >
            <SpendingSourcesApproval scenario={mixedScenario} isSheetOpenOnMount />
          </Board>
          <Board
            label="Taproot switched back on"
            note="Taproot is optional here and has just been switched on: the largest Taproot coin is reached for first, which the selected total and fee reflect. Apply to bring the Taproot warning into the approval."
          >
            <SpendingSourcesApproval
              scenario={taprootAvoidableScenario}
              initialSheetAllowed={['nativeSegwit', 'taproot']}
              isSheetOpenOnMount
            />
          </Board>
        </Grid>
      </Section>
    </Stack>
  );
}
