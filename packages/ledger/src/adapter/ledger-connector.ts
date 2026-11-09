import type {
  DeviceManagementKit,
  TransportFactory,
  TransportIdentifier,
} from '@ledgerhq/device-management-kit';

import type { BitcoinNetworkModes } from '@leather.io/models';

import { bitcoinAppNameForNetwork, isBitcoinAppOpen } from '../bitcoin/bitcoin-ledger-utils';
import { createLedgerBitcoinApp } from '../bitcoin/bitcoin-signer-kit-utils';
import type {
  HardwareWallet,
  HardwareWalletCapabilities,
  HardwareWalletConnector,
  HardwareWalletSession,
  OperationContext,
} from '../contract/hardware-wallet';
import { HardwareWalletError, throwIfOperationAborted } from '../contract/hardware-wallet-error';
import {
  type ChooseLedgerDevice,
  type LedgerDeviceConnection,
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
import { withLedgerErrors } from './ledger-error';
import { toLedgerDeviceActionOptions } from './ledger-interaction';
import { createLedgerStacksSigner } from './ledger-stacks-signer';

export const ledgerCapabilities: HardwareWalletCapabilities = {
  bitcoin: true,
  stacks: true,
  bitcoinWalletPolicies: true,
};

export interface CreateLedgerConnectorArgs {
  transportFactory: TransportFactory;
  transportIdentifier: TransportIdentifier;
  chooseDevice?: ChooseLedgerDevice;
  canPromptForDevice?(): boolean;
}

function toSession(
  dmk: DeviceManagementKit,
  { sessionId }: LedgerDeviceConnection,
  wallet: Omit<HardwareWallet, 'vendor' | 'capabilities'>
): HardwareWalletSession {
  return {
    vendor: 'ledger',
    capabilities: ledgerCapabilities,
    ...wallet,
    close() {
      return closeLedgerSession(dmk, sessionId);
    },
  };
}

async function closeOnFailure<Result>(
  dmk: DeviceManagementKit,
  { sessionId }: LedgerDeviceConnection,
  operation: () => Promise<Result>
): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    await closeLedgerSession(dmk, sessionId);
    throw error;
  }
}

async function readBitcoinApp(
  dmk: DeviceManagementKit,
  connection: LedgerDeviceConnection,
  network: BitcoinNetworkModes
) {
  const { name, version } = await getAppAndVersion(dmk, connection.sessionId);
  if (!isBitcoinAppOpen(network, name)) {
    const expectedAppName =
      network === 'mainnet' ? LEDGER_APPS_MAP.BITCOIN_MAINNET : LEDGER_APPS_MAP.BITCOIN_TESTNET;
    throw new HardwareWalletError(
      'wrong-app',
      `Open the ${expectedAppName} app on your Ledger, then try again.`
    );
  }
  return { name, version };
}

async function readStacksApp(stacksApp: ReturnType<typeof createLedgerStacksApp>) {
  const appVersion = await getStacksAppVersion(stacksApp);
  if (appVersion.deviceLocked) throw new HardwareWalletError('locked');
  const { meetsMinimum, currentVersion } = validateStacksAppVersion(appVersion);
  if (!meetsMinimum)
    throw new HardwareWalletError('outdated-app', undefined, {
      details: { currentVersion, requiredVersion: MINIMUM_STACKS_APP_VERSION },
    });
  return { name: appVersion.name, version: currentVersion };
}

export function createLedgerConnector({
  transportFactory,
  transportIdentifier,
  chooseDevice,
  canPromptForDevice = () => true,
}: CreateLedgerConnectorArgs): HardwareWalletConnector {
  let dmk: DeviceManagementKit | null = null;

  function getDmk() {
    dmk ??= buildLedgerDmk(transportFactory);
    return dmk;
  }

  function connectToApp(appName: string | null, ctx: OperationContext) {
    return connectLedgerDeviceToApp(getDmk(), transportIdentifier, appName, {
      canPromptForDevice: canPromptForDevice(),
      chooseDevice,
      ...toLedgerDeviceActionOptions(ctx, appName),
    });
  }

  return {
    vendor: 'ledger',
    capabilities: ledgerCapabilities,
    pair(ctx) {
      return withLedgerErrors(async () => {
        throwIfOperationAborted(ctx.signal);
        const kit = getDmk();
        const { sessionId, device } = await connectLedgerDeviceToApp(
          kit,
          transportIdentifier,
          null,
          { chooseDevice, ...toLedgerDeviceActionOptions(ctx) }
        );
        await closeLedgerSession(kit, sessionId);
        return { id: device.id, name: device.name };
      });
    },
    connect(request, ctx) {
      return withLedgerErrors(async () => {
        throwIfOperationAborted(ctx.signal);
        const kit = getDmk();

        if (request.chain === 'bitcoin') {
          const connection = await connectToApp(bitcoinAppNameForNetwork(request.network), ctx);
          return closeOnFailure(kit, connection, async () => {
            const app = await readBitcoinApp(kit, connection, request.network);
            const bitcoinApp = createLedgerBitcoinApp(kit, connection.sessionId);
            return toSession(kit, connection, {
              app,
              bitcoin: createLedgerBitcoinSigner(bitcoinApp),
              stacks: null,
            });
          });
        }

        const connection = await connectToApp(LEDGER_APPS_MAP.STACKS, ctx);
        return closeOnFailure(kit, connection, async () => {
          const stacksApp = createLedgerStacksApp(kit, connection.sessionId);
          const app = await readStacksApp(stacksApp);
          return toSession(kit, connection, {
            app,
            bitcoin: null,
            stacks: createLedgerStacksSigner(stacksApp),
          });
        });
      });
    },
  };
}
