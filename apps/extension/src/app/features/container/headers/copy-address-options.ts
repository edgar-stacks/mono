import type { AccountAddresses } from '@leather.io/models';

type CopyAddressOptionId = 'btc-native-segwit' | 'btc-taproot' | 'btc-policy' | 'stx';

export interface CopyAddressOption {
  id: CopyAddressOptionId;
  title: string;
  address: string;
  badge?: string;
  recommended?: boolean;
}

export function createCopyAddressOptions(account: AccountAddresses): CopyAddressOption[] {
  const options: CopyAddressOption[] = [];
  const { bitcoin, stacks } = account;

  if (bitcoin?.type === 'fixedAddress') {
    options.push({
      id: 'btc-policy',
      title: 'Bitcoin',
      address: bitcoin.address,
      badge: 'Policy address',
    });
  }

  if (bitcoin?.type === 'hd') {
    if (bitcoin.zeroIndexNativeSegwitPayerAddress) {
      options.push({
        id: 'btc-native-segwit',
        title: 'Bitcoin',
        address: bitcoin.zeroIndexNativeSegwitPayerAddress,
        badge: 'Native SegWit',
        recommended: true,
      });
    }
    if (bitcoin.zeroIndexTaprootPayerAddress) {
      options.push({
        id: 'btc-taproot',
        title: 'Bitcoin',
        address: bitcoin.zeroIndexTaprootPayerAddress,
        badge: 'Taproot',
      });
    }
  }

  if (stacks?.stxAddress) {
    options.push({ id: 'stx', title: 'Stacks', address: stacks.stxAddress });
  }

  return options;
}
