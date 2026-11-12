import lottie from 'lottie-web/build/player/lottie_light';

interface LoadLottieAnimationOptions {
  container: Element;
  path: string;
  loop: boolean;
}

export function loadLottieAnimation({ container, path, loop }: LoadLottieAnimationOptions) {
  return lottie.loadAnimation({
    container,
    path,
    loop,
    renderer: 'svg',
    autoplay: false,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
  });
}
