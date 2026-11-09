import { Box } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-registry';
import { resolveJourney } from '../journeys/journey-definitions';
import { ApprovalLedgerSheet } from '../pattern/approval-ledger-sheet';
import { ApprovalScreen } from '../pattern/approval-screen';
import type { ApprovalScreenEntry } from '../scenarios/approval-screens';

interface ScreenPreviewProps {
  entry: ApprovalScreenEntry;
  direction: ApprovalDirection;
  interactive?: boolean;
}

export function ScreenPreview({ entry, direction, interactive = false }: ScreenPreviewProps) {
  const { request } = resolveJourney({
    familyId: entry.familyId,
    variantId: entry.variantId,
    wallet: entry.wallet,
  });
  return (
    <Box position="relative" height="100%">
      <ApprovalScreen
        request={request}
        direction={direction}
        requestKey={entry.id}
        interactive={interactive}
      />
      {entry.state === 'device' ? (
        <Box
          position="absolute"
          inset={0}
          bg="rgba(0,0,0,0.32)"
          display="flex"
          alignItems="flex-end"
        >
          <Box width="100%">
            <ApprovalLedgerSheet state="review" chain={request.chain} preview />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
