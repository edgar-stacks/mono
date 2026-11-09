import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Box } from 'leather-styles/jsx';

import { ActivityBoard } from './canvas/activity-board';
import { ApprovalToolbar } from './canvas/approval-toolbar';
import { PrimitivesBoard } from './canvas/primitives-board';
import { ScreenCatalog } from './canvas/screen-catalog';
import { ScreenViewer } from './canvas/screen-viewer';
import { type ApprovalDirection, resolveDirection } from './directions/direction-registry';
import {
  type ApprovalFlowParams,
  createRunId,
  prototypeUrl,
  readApprovalFlowParams,
} from './journeys/journey-navigation';
import { JourneyPrototype } from './journeys/journey-prototype';

interface CanvasViewProps {
  params: ApprovalFlowParams;
  direction: ApprovalDirection;
}

function CanvasView({ params, direction }: CanvasViewProps) {
  switch (params.view) {
    case 'viewer':
      return <ScreenViewer screenId={params.screen} direction={direction} />;
    case 'primitives':
      return <PrimitivesBoard direction={direction} />;
    case 'activity':
      return <ActivityBoard />;
    case 'screens':
    default:
      return <ScreenCatalog direction={direction} />;
  }
}

export function ApprovalFlowsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = readApprovalFlowParams(searchParams);
  const direction = resolveDirection(params.direction);
  const [showReferences, setShowReferences] = useState(false);
  const needsRun = params.view === 'journeys' && !params.run;

  useEffect(() => {
    if (!needsRun) return;
    void navigate(
      prototypeUrl(searchParams, {
        journey: params.journey ?? 'connect',
        variant: params.variant ?? undefined,
        run: createRunId(),
      }),
      { replace: true }
    );
  }, [needsRun, navigate, searchParams, params.journey, params.variant]);

  if (params.view === 'journeys') {
    if (!params.run) return null;
    return (
      <JourneyPrototype key={params.run} params={params} runId={params.run} direction={direction} />
    );
  }

  return (
    <Box minHeight="100vh" bg="ink.background-primary" pb="space.11">
      <ApprovalToolbar
        view={params.view}
        direction={direction}
        showReferences={showReferences}
        onShowReferencesChange={setShowReferences}
      />
      <CanvasView params={params} direction={direction} />
    </Box>
  );
}
