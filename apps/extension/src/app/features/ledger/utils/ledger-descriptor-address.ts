import { type CompiledWshDescriptor, reencodeTestnetFamilyAddress } from '@leather.io/bitcoin';

type WshDescriptorKey = CompiledWshDescriptor['keys'][number];

export function toLedgerDisplayedAddress(address: string): string {
  return reencodeTestnetFamilyAddress(address, 'testnet') ?? address;
}

export function isLedgerOnDeviceAddressConfirmed(
  onDeviceAddress: string,
  expectedAddress: string | null | undefined
): boolean {
  if (!expectedAddress) return false;
  return toLedgerDisplayedAddress(onDeviceAddress) === toLedgerDisplayedAddress(expectedAddress);
}

export const ledgerRawKeyUnsupportedMessage =
  'Ledger cannot display this address. Every other signer must be an extended public key (xpub), and an account given as a raw public key needs the extended keys on the 0/0 path.';

export function isLedgerDisplayableDescriptor(
  compiled: CompiledWshDescriptor,
  accountKey: WshDescriptorKey
): boolean {
  if (compiled.keys.some(key => key !== accountKey && !key.bip32)) return false;
  if (accountKey.bip32) return true;
  const { changeIndex, addressIndex } = compiled.keyPathIndexes;
  return changeIndex === 0 && addressIndex === 0;
}
