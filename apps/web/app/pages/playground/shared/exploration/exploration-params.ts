import { useSearchParams } from 'react-router';

export const explorationThemes = ['light', 'dark'] as const;
export type ExplorationTheme = (typeof explorationThemes)[number];

const explorationSizes = ['popup', 'narrow', 'long'] as const;
export type ExplorationSize = (typeof explorationSizes)[number];

export const explorationFrameSizes: Record<ExplorationSize, { width: number; height: number }> = {
  popup: { width: 390, height: 600 },
  narrow: { width: 320, height: 600 },
  long: { width: 390, height: 900 },
};

function parseStep(value: string | null) {
  const step = Number(value);
  return Number.isInteger(step) && step >= 0 ? step : 0;
}

export function useExplorationParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const themeParam = searchParams.get('theme');
  const sizeParam = searchParams.get('size');

  const selectedTheme = explorationThemes.find(theme => theme === themeParam);
  const themes: readonly ExplorationTheme[] = selectedTheme ? [selectedTheme] : explorationThemes;
  const size = explorationSizes.find(candidate => candidate === sizeParam) ?? 'popup';
  const step = parseStep(searchParams.get('step'));
  const openFrame = searchParams.get('frame');

  function update(key: string, value: string | null) {
    setSearchParams(
      current => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  }

  return {
    themes,
    size,
    step,
    openFrame,
    setTheme(theme: ExplorationTheme | null) {
      update('theme', theme);
    },
    setSize(nextSize: ExplorationSize) {
      update('size', nextSize === 'popup' ? null : nextSize);
    },
    setStep(nextStep: number) {
      update('step', nextStep === 0 ? null : String(nextStep));
    },
    setOpenFrame(frameId: string | null) {
      update('frame', frameId);
    },
  };
}
