import type { AccountAddresses } from '@leather.io/models';

type CopyAddressOptionId = 'btc-native-segwit' | 'btc-taproot' | 'btc-policy' | 'stx';

export interface CopyAddressOption {
  id: CopyAddressOptionId;
  chain: 'bitcoin' | 'stacks';
  title: string;
  badge?: string;
  address: string;
  recommended?: boolean;
}

function createBitcoinOptions(bitcoin: AccountAddresses['bitcoin']): CopyAddressOption[] {
  if (!bitcoin) return [];

  if (bitcoin.type === 'fixedAddress') {
    return [
      {
        id: 'btc-policy',
        chain: 'bitcoin',
        title: 'Bitcoin',
        badge: 'Policy address',
        address: bitcoin.address,
      },
    ];
  }

  const options: CopyAddressOption[] = [];

  if (bitcoin.zeroIndexNativeSegwitPayerAddress) {
    options.push({
      id: 'btc-native-segwit',
      chain: 'bitcoin',
      title: 'Bitcoin',
      badge: 'Native SegWit',
      address: bitcoin.zeroIndexNativeSegwitPayerAddress,
      recommended: true,
    });
  }

  if (bitcoin.zeroIndexTaprootPayerAddress) {
    options.push({
      id: 'btc-taproot',
      chain: 'bitcoin',
      title: 'Bitcoin',
      badge: 'Taproot',
      address: bitcoin.zeroIndexTaprootPayerAddress,
    });
  }

  return options;
}

export function createCopyAddressOptions(account: AccountAddresses): CopyAddressOption[] {
  const options = createBitcoinOptions(account.bitcoin);

  if (account.bitcoin?.type === 'fixedAddress') return options;

  if (account.stacks?.stxAddress) {
    options.push({
      id: 'stx',
      chain: 'stacks',
      title: 'Stacks',
      address: account.stacks.stxAddress,
    });
  }

  return options;
}
