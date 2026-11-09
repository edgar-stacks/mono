import { useEffect, useState } from 'react';

import {
  type ComplianceReview,
  complianceScreeningDurationMs,
  createComplianceMailHref,
} from '../compliance-shared/compliance-content';
import {
  type ComplianceGate,
  HomeScreen,
  ReviewScreen,
} from '../compliance-shared/compliance-screens';

type ComplianceVerdict = Exclude<ComplianceGate, 'screening'>;

interface HomeThenLockoutProps {
  onLocked(): void;
}

export function HomeThenLockout({ onLocked }: HomeThenLockoutProps) {
  useEffect(() => {
    const timeout = setTimeout(onLocked, complianceScreeningDurationMs);
    return () => clearTimeout(timeout);
  }, [onLocked]);

  return <HomeScreen isScreening />;
}

function useScreeningGate(verdict: ComplianceVerdict) {
  const [gate, setGate] = useState<ComplianceGate>('screening');
  const [nextVerdict, setNextVerdict] = useState(verdict);

  useEffect(() => {
    if (gate !== 'screening') return;
    const timeout = setTimeout(() => setGate(nextVerdict), complianceScreeningDurationMs);
    return () => clearTimeout(timeout);
  }, [gate, nextVerdict]);

  function retry() {
    setNextVerdict('clean');
    setGate('screening');
  }

  return { gate, retry };
}

interface ScreenedReviewProps {
  review: ComplianceReview;
  verdict: ComplianceVerdict;
  onFinish(): void;
}

export function ScreenedReview({ review, verdict, onFinish }: ScreenedReviewProps) {
  const { gate, retry } = useScreeningGate(verdict);
  return (
    <ReviewScreen
      review={review}
      gate={gate}
      supportHref={createComplianceMailHref('support', 'extension')}
      onApprove={onFinish}
      onCancel={onFinish}
      onClose={onFinish}
      onRetry={retry}
    />
  );
}
