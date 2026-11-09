import { z } from 'zod';

import {
  type AccountAddresses,
  type AccountId,
  type FixedBitcoinAddressInfo,
} from '@leather.io/models';
import { type BtcAddress, addressResponseBodySchema } from '@leather.io/rpc';
import { createAccountAddresses } from '@leather.io/utils';

const fallbackAccountId: AccountId = { fingerprint: 'leather-mcp', accountIndex: 0 };

const accountIndexFromDerivationPathRegex = /^m\/\d+'\/\d+'\/(\d+)'/;

const testnetAddressPrefixes = ['tb1', 'bcrt1', 'm', 'n', '2', 'ST', 'SN'];

export const walletPairingSchema = z.object({
  account: z.custom<AccountAddresses>(
    value => typeof value === 'object' && value !== null && 'id' in value,
    'Invalid paired account'
  ),
  addresses: z.object({
    bitcoinPayment: z.string().optional(),
    bitcoinTaproot: z.string().optional(),
    stacks: z.string().optional(),
  }),
  pairedAt: z.string(),
});

export type WalletPairing = z.infer<typeof walletPairingSchema>;

type MapAddressesResult = { ok: true; pairing: WalletPairing } | { ok: false; message: string };

function readAccountId(btcAddresses: BtcAddress[]): AccountId {
  for (const address of btcAddresses) {
    if (!('fingerprint' in address) || !('derivationPath' in address)) continue;
    const match = accountIndexFromDerivationPathRegex.exec(address.derivationPath);
    if (!match) continue;
    return { fingerprint: address.fingerprint, accountIndex: Number(match[1]) };
  }
  return fallbackAccountId;
}

function isTestnetAddress(address: string) {
  return testnetAddressPrefixes.some(prefix => address.startsWith(prefix));
}

function createFixedBitcoinAddressInfo(
  btcAddresses: BtcAddress[]
): FixedBitcoinAddressInfo | undefined {
  const paymentAddress =
    btcAddresses.find(address => address.type === 'p2wpkh') ??
    btcAddresses.find(address => address.type === 'p2wsh') ??
    btcAddresses.find(address => address.type === 'p2tr');
  if (!paymentAddress) return undefined;
  return {
    type: 'fixedAddress',
    address: paymentAddress.address,
    paymentType: paymentAddress.type,
  };
}

export function mapAddressesResultToPairing(result: unknown, pairedAt: Date): MapAddressesResult {
  const parsed = addressResponseBodySchema.safeParse(result);
  if (!parsed.success) {
    return { ok: false, message: 'Leather returned addresses in an unexpected format.' };
  }

  const btcAddresses = parsed.data.addresses.filter(address => address.symbol === 'BTC');
  const stxAddress = parsed.data.addresses.find(address => address.symbol === 'STX')?.address;
  const paymentAddress = btcAddresses.find(address => address.type !== 'p2tr')?.address;
  const taprootAddress = btcAddresses.find(address => address.type === 'p2tr')?.address;

  if (!stxAddress && btcAddresses.length === 0) {
    return { ok: false, message: 'Leather shared no Bitcoin or Stacks addresses.' };
  }

  const sharedAddresses = [stxAddress, ...btcAddresses.map(address => address.address)];
  if (sharedAddresses.some(address => address && isTestnetAddress(address))) {
    return {
      ok: false,
      message: 'Leather shared testnet addresses. Switch Leather to mainnet and connect again.',
    };
  }

  const account = createAccountAddresses(
    readAccountId(btcAddresses),
    btcAddresses.map(address => address.descriptor),
    stxAddress
  );
  const bitcoin = account.bitcoin ?? createFixedBitcoinAddressInfo(btcAddresses);

  return {
    ok: true,
    pairing: {
      account: bitcoin ? { ...account, bitcoin } : account,
      addresses: {
        bitcoinPayment: paymentAddress,
        bitcoinTaproot: taprootAddress,
        stacks: stxAddress,
      },
      pairedAt: pairedAt.toISOString(),
    },
  };
}
