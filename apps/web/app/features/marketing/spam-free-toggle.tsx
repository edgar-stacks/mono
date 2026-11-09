import { useRef, useState } from 'react';

import { styled } from 'leather-styles/jsx';
import type { AnimationItem, AnimationSegment } from 'lottie-web';

import { LottieAnimation } from './lottie-animation';
import { marketingAssetPath } from './marketing-data';

const idleSegment: AnimationSegment = [0, 175];
const activeSegment: AnimationSegment = [200, 300];

export function SpamFreeToggle() {
  const animationRef = useRef<AnimationItem | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  function playIdle(animation: AnimationItem) {
    animation.loop = true;
    animation.playSegments(idleSegment, true);
  }

  function onToggle() {
    const animation = animationRef.current;
    const nextPressed = !isPressed;
    setIsPressed(nextPressed);
    if (!animation) return;
    if (nextPressed) {
      animation.loop = false;
      animation.playSegments(activeSegment, true);
      return;
    }
    playIdle(animation);
  }

  return (
    <styled.button
      type="button"
      aria-pressed={isPressed}
      aria-label="Hide spam"
      onClick={onToggle}
      width="100%"
      cursor="pointer"
      borderRadius="md"
      _focusVisible={{ outline: '2px solid', outlineColor: 'ink.action-primary-default' }}
    >
      <LottieAnimation
        src={`${marketingAssetPath}/lottie/spam-free.json`}
        poster={`${marketingAssetPath}/posters/spam-free.png`}
        alt="Hide spam toggle filtering unwanted tokens"
        width={390}
        height={280}
        playback="manual"
        onAnimationReady={animation => {
          animationRef.current = animation;
          playIdle(animation);
        }}
      />
    </styled.button>
  );
}
