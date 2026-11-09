import type { ReactNode } from 'react';

import { ActivitySelectors } from '@tests/selectors/activity.selectors';

import { DetailsScreen } from '@app/components/details/details-screen';

import { useActivityDetailsBack } from '../use-activity-details-back';

const activityDetailsTitle = 'Transaction';

interface ActivityDetailsScreenProps {
  children: ReactNode;
}

export function ActivityDetailsScreen({ children }: ActivityDetailsScreenProps) {
  const onBack = useActivityDetailsBack();
  return (
    <DetailsScreen
      title={activityDetailsTitle}
      onBack={onBack}
      testId={ActivitySelectors.ActivityDetails}
      backTestId={ActivitySelectors.ActivityDetailsBackBtn}
      titleTestId={ActivitySelectors.ActivityDetailsTitle}
    >
      {children}
    </DetailsScreen>
  );
}
