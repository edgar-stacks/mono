import { useRef } from 'react';

import { Box } from 'leather-styles/jsx';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

import pluggedInCable from '@leather.io/ui/assets/animations/plugged-in-cable-bright.lottie.json';

import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const ledgerConnectedFrame = pluggedInCable.op - 1;

interface ApprovalLedgerAnimationProps {
  preview?: boolean;
}

export function ApprovalLedgerAnimation({ preview = false }: ApprovalLedgerAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const still = preview || reducedMotion;

  function holdConnectedFrame() {
    if (still) lottieRef.current?.goToAndStop(ledgerConnectedFrame, true);
  }

  return (
    <Box
      height="176px"
      overflow="hidden"
      position="relative"
      width="100%"
      data-motion={still ? 'still' : 'animated'}
      aria-hidden
    >
      <Box position="absolute" left={0} right={0}>
        <Lottie
          key={still ? 'still' : 'animated'}
          lottieRef={lottieRef}
          animationData={pluggedInCable}
          autoplay={!still}
          loop={!still}
          onDOMLoaded={holdConnectedFrame}
          style={{ width: '100%', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}
        />
      </Box>
    </Box>
  );
}
