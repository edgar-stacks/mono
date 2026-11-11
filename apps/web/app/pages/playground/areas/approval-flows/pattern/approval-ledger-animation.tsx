import { Suspense, lazy } from 'react';

import { Box, Flex } from 'leather-styles/jsx';

import { ConnectLedgerSuccess } from '@leather.io/ui';

import { useReducedMotion } from './use-reduced-motion';

const animationHeight = 200;
const animationMaxWidth = 380;

const LedgerCableLottie = lazy(async () => {
  const [{ default: Lottie }, { default: animationData }] = await Promise.all([
    import('lottie-react'),
    import('@leather.io/ui/assets/animations/plugged-in-cable-bright.lottie.json'),
  ]);
  return {
    default: function LedgerCableLottie() {
      return (
        <Lottie
          animationData={animationData}
          loop
          style={{
            width: '100%',
            maxWidth: animationMaxWidth,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        />
      );
    },
  };
});

function StaticCable() {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      height="100%"
      color="ink.text-primary"
      data-testid="ledger-animation-static"
    >
      <ConnectLedgerSuccess />
    </Flex>
  );
}

export function ApprovalLedgerAnimation() {
  const reducedMotion = useReducedMotion();
  return (
    <Box
      position="relative"
      width="100%"
      overflow="hidden"
      style={{ height: animationHeight }}
      aria-label="Plug in your Ledger and unlock it"
      role="img"
    >
      {reducedMotion ? (
        <StaticCable />
      ) : (
        <Suspense fallback={<StaticCable />}>
          <LedgerCableLottie />
        </Suspense>
      )}
    </Box>
  );
}
