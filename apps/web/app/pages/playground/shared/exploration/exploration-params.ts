import { useSearchParams } from 'react-router';

export const explorationThemes = ['light', 'dark'] as const;
export type ExplorationTheme = (typeof explorationThemes)[number];

const explorationWidths = ['popup', 'narrow'] as const;
export type ExplorationWidth = (typeof explorationWidths)[number];

interface ExplorationParams {
  theme?: ExplorationTheme;
  width?: ExplorationWidth;
  frame?: string;
  step: number;
}

function pickOption<T extends string>(options: readonly T[], value: string | null) {
  return options.find(option => option === value);
}

export function parseExplorationParams(params: URLSearchParams): ExplorationParams {
  const step = Number(params.get('step'));
  return {
    theme: pickOption(explorationThemes, params.get('theme')),
    width: pickOption(explorationWidths, params.get('width')),
    frame: params.get('frame') ?? undefined,
    step: Number.isInteger(step) && step > 0 ? step : 0,
  };
}

export function useExplorationParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  function update(changes: Partial<Record<'theme' | 'width' | 'frame' | 'step', string | null>>) {
    setSearchParams(
      current => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null || value === undefined) next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  }

  return { params: parseExplorationParams(searchParams), update };
}
