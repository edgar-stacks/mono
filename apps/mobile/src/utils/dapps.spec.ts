import { describe, expect, it, vi } from 'vitest';

import {
  ALEX_LINK,
  ARKADIKO_LINK,
  BITFLOW_LINK,
  GRANITE_LINK,
  HERMETICA_LINK,
  VELAR_LINK,
  ZEST_LINK,
} from '@leather.io/constants';

import { getDappMap } from './dapps';

vi.mock('@lingui/core/macro', () => ({
  t: (s: string) => s,
}));

vi.mock('@leather.io/ui/native', () => ({
  AlexLogo: vi.fn(),
  ArkadikoLogo: vi.fn(),
  BitflowLogo: vi.fn(),
  CharismaLogo: vi.fn(),
  FastPoolLogo: vi.fn(),
  GraniteLogo: vi.fn(),
  HermeticaLogo: vi.fn(),
  LeatherLogo: vi.fn(),
  LisaLogo: vi.fn(),
  PlanBetterLogo: vi.fn(),
  RestakeLogo: vi.fn(),
  StackingDaoLogo: vi.fn(),
  VelarLogo: vi.fn(),
  XverseLogo: vi.fn(),
  ZestLogo: vi.fn(),
}));

describe(getDappMap.name, () => {
  it('opens each partner on its shared link constant', () => {
    const dapps = getDappMap();

    expect(dapps.alex.url).toEqual(ALEX_LINK);
    expect(dapps.arkadiko.url).toEqual(ARKADIKO_LINK);
    expect(dapps.bitflow.url).toEqual(BITFLOW_LINK);
    expect(dapps.granite.url).toEqual(GRANITE_LINK);
    expect(dapps.hermetica.url).toEqual(HERMETICA_LINK);
    expect(dapps.velar.url).toEqual(VELAR_LINK);
    expect(dapps.zest.url).toEqual(ZEST_LINK);
  });

  it('opens Velar on www.velar.co', () => {
    expect(getDappMap().velar.url).toEqual('https://www.velar.co');
  });
});
