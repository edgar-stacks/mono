import type { ComponentType } from 'react';
import { useSearchParams } from 'react-router';

import { Box } from 'leather-styles/jsx';

import { ActivityView } from './canvas/activity-view';
import { CanvasToolbar } from './canvas/canvas-toolbar';
import { PrimitivesView } from './canvas/primitives-view';
import { ScreenCatalog } from './canvas/screen-catalog';
import { ScreenViewer } from './canvas/screen-viewer';
import { type CanvasView, parseCanvasView } from './journeys/journey-navigation';
import { JourneysView } from './journeys/journeys-view';

const canvasContent: Record<CanvasView, ComponentType> = {
  screens: ScreenCatalog,
  viewer: ScreenViewer,
  primitives: PrimitivesView,
  activity: ActivityView,
  journeys: JourneysView,
};

export function ApprovalFlowsPage() {
  const [params] = useSearchParams();
  const view = parseCanvasView(params.get('view'));
  const CanvasContent = canvasContent[view];
  return (
    <Box minHeight="100vh" bg="ink.background-primary">
      {view === 'journeys' ? null : <CanvasToolbar view={view} params={params} />}
      <CanvasContent />
    </Box>
  );
}
