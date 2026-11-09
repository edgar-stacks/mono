import type { DeviceManagementKit, TransportFactory } from '@ledgerhq/device-management-kit';

import type { BitcoinNetworkModes } from '@leather.io/models';

import { bitcoinAppNameForNetwork, isBitcoinAppOpen } from '../bitcoin/bitcoin-ledger-utils';
import { createLedgerBitcoinApp } from '../bitcoin/bitcoin-signer-kit-utils';
import type {
  HardwareWallet,
  HardwareWalletCapabilities,
  HardwareWalletConnector,
} from '../contract/hardware-wallet';
import { HardwareWalletError } from '../contract/hardware-wallet-error';
import {
  type LedgerTransportOptions,
  connectLedgerDeviceToApp,
  getAppAndVersion,
} from '../dmk/ledger-device-connection';
import { buildLedgerDmk } from '../dmk/ledger-dmk';
import { closeLedgerSession } from '../dmk/ledger-session';
import { LEDGER_APPS_MAP } from '../ledger-app';
import {
  MINIMUM_STACKS_APP_VERSION,
  createLedgerStacksApp,
  getStacksAppVersion,
  validateStacksAppVersion,
} from '../stacks/stacks-ledger-utils';
import { createLedgerBitcoinSigner } from './ledger-bitcoin-signer';
import { withLedgerErrors } from './ledger-error-mapping';
import { makeRunLedgerDeviceAction } from './ledger-interaction';
import { createLedgerStacksSigner } from './ledger-stacks-signer';

export const ledgerCapabilities: HardwareWalletCapabilities = {
  chains: ['bitcoin', 'stacks'],
  walletPolicies: true,
  stacksDerivationPathTypes: ['stacks', 'bip44'],
};

export interface CreateLedgerConnectorArgs extends LedgerTransportOptions {
  transportFactory: TransportFactory;
  canPromptForDevice?(): boolean;
}

function expectedBitcoinAppName(network: BitcoinNetworkModes) {
  return network === 'mainnet' ? LEDGER_APPS_MAP.BITCOIN_MAINNET : LEDGER_APPS_MAP.BITCOIN_TESTNET;
}

async function openBitcoinWallet(
  dmk: DeviceManagementKit,
  sessionId: string,
  network: BitcoinNetworkModes
): Promise<HardwareWallet> {
  const { name, version } = await getAppAndVersion(dmk, sessionId);
  if (!isBitcoinAppOpen({ network })({ name }))
    throw new HardwareWalletError(
      'wrong-app',
      `Open the ${expectedBitcoinAppName(network)} app on your Ledger, then try again.`
    );
  return {
    vendor: 'ledger',
    capabilities: ledgerCapabilities,
    app: { name, version },
    bitcoin: createLedgerBitcoinSigner(createLedgerBitcoinApp(dmk, sessionId)),
    stacks: null,
  };
}

async function openStacksWallet(
  dmk: DeviceManagementKit,
  sessionId: string
): Promise<HardwareWallet> {
  const app = createLedgerStacksApp(dmk, sessionId);
  const appVersion = await getStacksAppVersion(app);
  if (appVersion.deviceLocked) throw new HardwareWalletError('locked');
  const { meetsMinimum, currentVersion } = validateStacksAppVersion(appVersion);
  if (!meetsMinimum)
    throw new HardwareWalletError(
      'outdated-app',
      `The Ledger Stacks app ${currentVersion} is older than the required ${MINIMUM_STACKS_APP_VERSION}`,
      { details: { currentVersion, requiredVersion: MINIMUM_STACKS_APP_VERSION } }
    );
  return {
    vendor: 'ledger',
    capabilities: ledgerCapabilities,
    app: { name: appVersion.name, version: currentVersion },
    bitcoin: null,
    stacks: createLedgerStacksSigner(app),
  };
}

export function createLedgerConnector({
  transportFactory,
  transportIdentifier,
  chooseDevice,
  canPromptForDevice,
}: CreateLedgerConnectorArgs): HardwareWalletConnector {
  const transport: LedgerTransportOptions = { transportIdentifier, chooseDevice };
  let ledgerDmk: DeviceManagementKit | null = null;

  function getDmk() {
    ledgerDmk ??= buildLedgerDmk(transportFactory);
    return ledgerDmk;
  }

  return {
    vendor: 'ledger',
    capabilities: ledgerCapabilities,

    pair: withLedgerErrors(async ctx => {
      const dmk = getDmk();
      const sessionId = await connectLedgerDeviceToApp(dmk, transport, null, {
        runAction: makeRunLedgerDeviceAction(ctx, null),
      });
      try {
        const device = dmk.getConnectedDevice({ sessionId });
        return { id: device.id, name: device.name, vendor: 'ledger' };
      } finally {
        await closeLedgerSession(dmk, sessionId);
      }
    }),

    connect: withLedgerErrors(async (request, ctx) => {
      const dmk = getDmk();
      const appName =
        request.chain === 'stacks'
          ? LEDGER_APPS_MAP.STACKS
          : bitcoinAppNameForNetwork(request.network);
      const sessionId = await connectLedgerDeviceToApp(dmk, transport, appName, {
        canPromptForDevice: canPromptForDevice?.() ?? true,
        runAction: makeRunLedgerDeviceAction(ctx, appName),
      });
      try {
        const wallet =
          request.chain === 'stacks'
            ? await openStacksWallet(dmk, sessionId)
            : await openBitcoinWallet(dmk, sessionId, request.network);
        return {
          wallet,
          close() {
            return closeLedgerSession(dmk, sessionId);
          },
        };
      } catch (error) {
        await closeLedgerSession(dmk, sessionId);
        throw error;
      }
    }),
  };
}
