import { mixedScenario, taprootAvoidableScenario } from './spending-sources-mock-data';
import { getDefaultAllowed, isRequiredToCover, planSpend } from './spending-sources.utils';

describe(planSpend.name, () => {
  test('it spends both address types when the mixed scenario needs Taproot', () => {
    const { sources, amountSats } = mixedScenario;
    expect(planSpend({ sources, amountSats, allowed: ['nativeSegwit', 'taproot'] })).toEqual({
      isCovered: true,
      feeSats: 1_335,
      selectedSats: 444_000,
      spentByType: { nativeSegwit: 412_000, taproot: 32_000 },
    });
  });

  test('it reports the mixed scenario as uncovered by Native SegWit alone', () => {
    const { sources, amountSats } = mixedScenario;
    expect(planSpend({ sources, amountSats, allowed: ['nativeSegwit'] })).toEqual({
      isCovered: false,
      feeSats: 1_045,
      selectedSats: 412_000,
      spentByType: { nativeSegwit: 412_000, taproot: 0 },
    });
  });

  test('it covers the Taproot-avoidable scenario with Native SegWit alone', () => {
    const { sources, amountSats } = taprootAvoidableScenario;
    expect(planSpend({ sources, amountSats, allowed: ['nativeSegwit'] })).toEqual({
      isCovered: true,
      feeSats: 1_045,
      selectedSats: 500_000,
      spentByType: { nativeSegwit: 500_000, taproot: 0 },
    });
  });

  test('it reaches for the largest Taproot coin first once Taproot is allowed', () => {
    const { sources, amountSats } = taprootAvoidableScenario;
    expect(planSpend({ sources, amountSats, allowed: ['nativeSegwit', 'taproot'] })).toEqual({
      isCovered: true,
      feeSats: 995,
      selectedSats: 650_000,
      spentByType: { nativeSegwit: 300_000, taproot: 350_000 },
    });
  });

  test('it is uncovered when no address type is allowed', () => {
    const { sources, amountSats } = mixedScenario;
    expect(planSpend({ sources, amountSats, allowed: [] }).isCovered).toBe(false);
  });
});

describe(isRequiredToCover.name, () => {
  test('it requires both address types in the mixed scenario', () => {
    const { sources, amountSats } = mixedScenario;
    expect(isRequiredToCover({ sources, amountSats, type: 'nativeSegwit' })).toBe(true);
    expect(isRequiredToCover({ sources, amountSats, type: 'taproot' })).toBe(true);
  });

  test('it requires only Native SegWit in the Taproot-avoidable scenario', () => {
    const { sources, amountSats } = taprootAvoidableScenario;
    expect(isRequiredToCover({ sources, amountSats, type: 'nativeSegwit' })).toBe(true);
    expect(isRequiredToCover({ sources, amountSats, type: 'taproot' })).toBe(false);
  });
});

describe(getDefaultAllowed.name, () => {
  test('it allows every address type when Native SegWit alone cannot cover the mixed scenario', () => {
    const { sources, amountSats } = mixedScenario;
    expect(getDefaultAllowed({ sources, amountSats })).toEqual(['nativeSegwit', 'taproot']);
  });

  test('it keeps Taproot out when Native SegWit alone covers the transfer', () => {
    const { sources, amountSats } = taprootAvoidableScenario;
    expect(getDefaultAllowed({ sources, amountSats })).toEqual(['nativeSegwit']);
  });
});
