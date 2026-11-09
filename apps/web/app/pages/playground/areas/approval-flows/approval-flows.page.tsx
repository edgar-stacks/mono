import { useSearchParams } from 'react-router';

import { Box } from 'leather-styles/jsx';

import { ApprovalActivity } from './canvas/approval-activity';
import { ApprovalCatalog } from './canvas/approval-catalog';
import { ApprovalPrimitives } from './canvas/approval-primitives';
import { ApprovalToolbar } from './canvas/approval-toolbar';
import { ApprovalViewer } from './canvas/approval-viewer';
import { getApprovalDirection } from './directions/direction-registry';
import { parseApprovalView } from './journeys/journey-navigation';
import { JourneyPrototype } from './journeys/journey-prototype';

export function ApprovalFlowsPage() {
  const [params] = useSearchParams();
  const view = parseApprovalView(params);
  const direction = getApprovalDirection(params.get('direction'));

  if (view === 'journeys') {
    return <JourneyPrototype params={params} direction={direction} />;
  }

  return (
    <Box minHeight="100vh" bg="ink.background-primary" pb="space.10">
      <ApprovalToolbar view={view} params={params} direction={direction} />
      {view === 'screens' ? <ApprovalCatalog params={params} direction={direction} /> : null}
      {view === 'viewer' ? <ApprovalViewer params={params} direction={direction} /> : null}
      {view === 'primitives' ? <ApprovalPrimitives direction={direction} /> : null}
      {view === 'activity' ? <ApprovalActivity /> : null}
    </Box>
  );
}
