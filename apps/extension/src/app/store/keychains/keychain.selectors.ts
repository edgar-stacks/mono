import { useSelector } from 'react-redux';

import { createSelector } from '@reduxjs/toolkit';

import {
  extractAccountIndexFromDescriptor,
  extractFingerprintFromDescriptor,
  makeAccountIdentifer,
} from '@leather.io/crypto';
import { keychainAdapter } from '@leather.io/state/keychains';

import { type RootState } from '@app/store/store';

function selectKeychainsSlice(state: RootState) {
  return state.keychains;
}

const keychainSelectors = keychainAdapter.getSelectors(selectKeychainsSlice);

const selectAllKeychains = keychainSelectors.selectAll;

export const selectBitcoinKeychains = createSelector([selectAllKeychains], keychains =>
  keychains.filter(keychain => keychain.chain === 'bitcoin')
);

const selectBitcoinKeychainDescriptors = createSelector([selectBitcoinKeychains], keychains =>
  keychains.map(keychain => keychain.descriptor)
);

const selectBitcoinAccountIdentifiers = createSelector(
  [selectBitcoinKeychainDescriptors],
  descriptors => {
    const identifiers = new Set<string>();
    for (const descriptor of descriptors) {
      try {
        identifiers.add(
          makeAccountIdentifer(
            extractFingerprintFromDescriptor(descriptor),
            extractAccountIndexFromDescriptor(descriptor)
          )
        );
      } catch {
        continue;
      }
    }
    return [...identifiers];
  }
);

export const selectStacksKeychains = createSelector([selectAllKeychains], keychains =>
  keychains.filter(keychain => keychain.chain === 'stacks')
);

const selectStacksKeychainDescriptors = createSelector([selectStacksKeychains], keychains =>
  keychains.map(keychain => keychain.descriptor)
);

export function useBitcoinKeychainDescriptors() {
  return useSelector(selectBitcoinKeychainDescriptors);
}

export function useStacksKeychainDescriptors() {
  return useSelector(selectStacksKeychainDescriptors);
}

export function useBitcoinAccountIdentifiers() {
  return useSelector(selectBitcoinAccountIdentifiers);
}
