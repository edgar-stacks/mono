import { describe, expect, it } from 'vitest';

import { parseExplorationParams } from './exploration-params';

describe('parseExplorationParams', () => {
  it('reads known theme, width, frame and step values', () => {
    const params = parseExplorationParams(
      new URLSearchParams('theme=dark&width=narrow&frame=choose-asset-dark&step=1')
    );
    expect(params).toEqual({ theme: 'dark', width: 'narrow', frame: 'choose-asset-dark', step: 1 });
  });

  it('ignores unknown values and falls back to the first step', () => {
    const params = parseExplorationParams(new URLSearchParams('theme=sepia&width=wide&step=-2'));
    expect(params).toEqual({ theme: undefined, width: undefined, frame: undefined, step: 0 });
  });
});
