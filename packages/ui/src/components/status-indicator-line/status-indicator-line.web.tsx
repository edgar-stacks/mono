import { css } from 'leather-styles/css';
import { styled } from 'leather-styles/jsx';

export type StatusIndicatorLineStatus = 'completed' | 'error' | 'pending';

const loadingStripedGradient = css({
  backgroundImage: 'repeating-linear-gradient(135deg, #F07D12 0 16px, #FFB977 16px 32px)',
  backgroundSize: '45.26px 100%',
  animation: 'barberpole 1.6s linear infinite',
  _motionReduce: { animation: 'none' },
});

export interface StatusIndicatorLineProps {
  status: StatusIndicatorLineStatus;
}
export function StatusIndicatorLine({ status }: StatusIndicatorLineProps) {
  switch (status) {
    case 'pending':
      return <styled.div height="4px" className={loadingStripedGradient} />;
    case 'error':
      return <styled.div height="4px" bg="red.action-primary-default" />;
    case 'completed':
      return <styled.div height="4px" bg="green.action-primary-default" />;
    default:
      return null;
  }
}
