import { useRef } from 'react';

import { Box } from 'leather-styles/jsx';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

import pluggedInCableAnimation from '@leather.io/ui/assets/animations/plugged-in-cable-bright.lottie.json';

import { useReducedMotion } from './use-reduced-motion';

export const connectedFrame = pluggedInCableAnimation.op - 1;

interface ApprovalLedgerAnimationProps {
  interactive?: boolean;
}

export function ApprovalLedgerAnimation({ interactive = true }: ApprovalLedgerAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const reducedMotion = useReducedMotion();
  const isStill = reducedMotion || !interactive;

  function holdConnectedFrame() {
    if (isStill) lottieRef.current?.goToAndStop(connectedFrame, true);
  }

  return (
    <Box
      height="160px"
      overflow="hidden"
      position="relative"
      width="100%"
      data-motion={isStill ? 'still' : 'animated'}
      _dark={{ filter: 'invert(1)' }}
    >
      <Lottie
        key={isStill ? 'still' : 'animated'}
        lottieRef={lottieRef}
        animationData={pluggedInCableAnimation}
        autoplay={!isStill}
        loop={!isStill}
        onDOMLoaded={holdConnectedFrame}
        style={{ width: '100%', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}
      />
    </Box>
  );
}
