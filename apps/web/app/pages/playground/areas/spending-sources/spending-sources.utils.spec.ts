import { mixedScenario, taprootAvoidableScenario } from './spending-sources.mock-data';
import {
  type AddressType,
  getDefaultAllowed,
  isRequiredToCover,
  planSpend,
} from './spending-sources.utils';

const bothTypes: AddressType[] = ['nativeSegwit', 'taproot'];

describe('planSpend', () => {
  test('pools both address types largest first when Native SegWit alone falls short', () => {
    const plan = planSpend({
      sources: mixedScenario.sources,
      allowed: bothTypes,
      amountSats: mixedScenario.amountSats,
    });
    expect(plan).toEqual({
      isCovered: true,
      feeSats: 1_335,
      selectedSats: 444_000,
      spentByType: { nativeSegwit: 412_000, taproot: 32_000 },
    });
  });

  test('reports a shortfall when the allowed coins cannot cover amount plus fee', () => {
    const plan = planSpend({
      sources: mixedScenario.sources,
      allowed: ['nativeSegwit'],
      amountSats: mixedScenario.amountSats,
    });
    expect(plan.isCovered).toBe(false);
    expect(plan.selectedSats).toBe(412_000);
    expect(plan.spentByType.taproot).toBe(0);
  });

  test('covers the transfer from Native SegWit alone when Taproot is left out', () => {
    const plan = planSpend({
      sources: taprootAvoidableScenario.sources,
      allowed: ['nativeSegwit'],
      amountSats: taprootAvoidableScenario.amountSats,
    });
    expect(plan).toEqual({
      isCovered: true,
      feeSats: 1_045,
      selectedSats: 500_000,
      spentByType: { nativeSegwit: 500_000, taproot: 0 },
    });
  });

  test('reaches for the largest Taproot coin first when Taproot is allowed', () => {
    const plan = planSpend({
      sources: taprootAvoidableScenario.sources,
      allowed: bothTypes,
      amountSats: taprootAvoidableScenario.amountSats,
    });
    expect(plan).toEqual({
      isCovered: true,
      feeSats: 995,
      selectedSats: 650_000,
      spentByType: { nativeSegwit: 300_000, taproot: 350_000 },
    });
  });
});

describe('isRequiredToCover', () => {
  test('marks both address types as required in the mixed scenario', () => {
    const input = {
      sources: mixedScenario.sources,
      allowed: bothTypes,
      amountSats: mixedScenario.amountSats,
    };
    expect(isRequiredToCover({ ...input, type: 'nativeSegwit' })).toBe(true);
    expect(isRequiredToCover({ ...input, type: 'taproot' })).toBe(true);
  });

  test('only requires Native SegWit when Taproot is avoidable', () => {
    const input = {
      sources: taprootAvoidableScenario.sources,
      allowed: bothTypes,
      amountSats: taprootAvoidableScenario.amountSats,
    };
    expect(isRequiredToCover({ ...input, type: 'nativeSegwit' })).toBe(true);
    expect(isRequiredToCover({ ...input, type: 'taproot' })).toBe(false);
  });
});

describe('getDefaultAllowed', () => {
  test('keeps Taproot in when Native SegWit alone cannot cover the transfer', () => {
    expect(getDefaultAllowed(mixedScenario.sources, mixedScenario.amountSats)).toEqual([
      'nativeSegwit',
      'taproot',
    ]);
  });

  test('leaves Taproot out when Native SegWit alone covers the transfer', () => {
    expect(
      getDefaultAllowed(taprootAvoidableScenario.sources, taprootAvoidableScenario.amountSats)
    ).toEqual(['nativeSegwit']);
  });
});
