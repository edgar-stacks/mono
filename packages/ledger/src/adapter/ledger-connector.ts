import type {
  DeviceManagementKit,
  DeviceSessionId,
  TransportFactory,
  TransportIdentifier,
} from '@ledgerhq/device-management-kit';
import StacksApp, { DMKTransport } from '@zondax/ledger-stacks';

import type { BitcoinNetworkModes } from '@leather.io/models';

import { bitcoinAppNameForNetwork, isBitcoinAppOpen } from '../bitcoin/bitcoin-ledger-utils';
import { createLedgerBitcoinApp } from '../bitcoin/bitcoin-signer-kit-utils';
import type {
  ConnectRequest,
  DiscoveredHardwareDevice,
  HardwareWalletAppInfo,
  HardwareWalletCapabilities,
  HardwareWalletConnector,
  HardwareWalletSession,
} from '../contract/hardware-wallet';
import { HardwareWalletError, throwIfOperationAborted } from '../contract/hardware-wallet-error';
import type { OperationContext } from '../contract/operation-context';
import {
  type ChooseLedgerDevice,
  connectLedgerDeviceToApp,
  getAppAndVersion,
} from '../dmk/ledger-device-connection';
import { buildLedgerDmk } from '../dmk/ledger-dmk';
import { closeLedgerSession } from '../dmk/ledger-session';
import { ledgerAppNames } from '../ledger-app';
import {
  MINIMUM_STACKS_APP_VERSION,
  getStacksAppVersion,
  validateStacksAppVersion,
} from '../stacks/stacks-ledger-utils';
import { makeLedgerActionRunner } from './ledger-action-runner';
import { createLedgerBitcoinSigner } from './ledger-bitcoin-signer';
import { toHardwareWalletError, withLedgerErrors } from './ledger-error-mapping';
import { createLedgerStacksSigner } from './ledger-stacks-signer';

const ledgerCapabilities: HardwareWalletCapabilities = {
  chains: ['bitcoin', 'stacks'],
  bitcoinWalletPolicies: true,
};

export interface CreateLedgerConnectorArgs {
  transportFactory: TransportFactory;
  transportIdentifier: TransportIdentifier;
  chooseDevice?: ChooseLedgerDevice;
  canPromptForDevice?(): boolean;
  onSessionCloseError?(error: unknown): void;
}

interface ConnectedLedgerApp {
  app: HardwareWalletAppInfo;
  signers: Pick<HardwareWalletSession, 'bitcoin' | 'stacks'>;
}

function makeWrongAppError(appName: string) {
  return new HardwareWalletError(
    'wrong-app',
    `Unable to open the ${appName} app on your Ledger. Make sure it is installed on the device, approve any prompt shown there, then try again.`
  );
}

function getRequestedAppName(request: ConnectRequest) {
  if (request.chain === 'stacks') return ledgerAppNames.stacks;
  return bitcoinAppNameForNetwork(request.network);
}

async function connectBitcoinApp(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId,
  network: BitcoinNetworkModes
): Promise<ConnectedLedgerApp> {
  const { name, version } = await getAppAndVersion(dmk, sessionId);
  if (!isBitcoinAppOpen(network, name))
    throw makeWrongAppError(bitcoinAppNameForNetwork(network) ?? ledgerAppNames.bitcoinTestnet);
  const bitcoinApp = createLedgerBitcoinApp(dmk, sessionId);
  return {
    app: { name, version },
    signers: { bitcoin: createLedgerBitcoinSigner(bitcoinApp, name), stacks: null },
  };
}

async function connectStacksApp(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId
): Promise<ConnectedLedgerApp> {
  const stacksApp = {
    chain: 'stacks' as const,
    app: new StacksApp(new DMKTransport(dmk, sessionId)),
    sessionId,
  };
  const appVersion = await getStacksAppVersion(stacksApp);
  if (appVersion.deviceLocked) throw new HardwareWalletError('locked');
  const { meetsMinimum, currentVersion } = validateStacksAppVersion(appVersion);
  if (!meetsMinimum)
    throw new HardwareWalletError('outdated-app', undefined, {
      details: { currentVersion, requiredVersion: MINIMUM_STACKS_APP_VERSION },
    });
  return {
    app: { name: appVersion.name, version: currentVersion },
    signers: { bitcoin: null, stacks: createLedgerStacksSigner(stacksApp) },
  };
}

export function createLedgerConnector({
  transportFactory,
  transportIdentifier,
  chooseDevice,
  canPromptForDevice = () => true,
  onSessionCloseError,
}: CreateLedgerConnectorArgs): HardwareWalletConnector {
  let dmk: DeviceManagementKit | null = null;

  function getDmk() {
    dmk ??= buildLedgerDmk(transportFactory);
    return dmk;
  }

  function closeSession(sessionId: DeviceSessionId) {
    return closeLedgerSession(getDmk(), sessionId, onSessionCloseError);
  }

  async function openSession(request: ConnectRequest, ctx: OperationContext) {
    const appName = getRequestedAppName(request);
    const sessionId = await connectLedgerDeviceToApp(getDmk(), appName, {
      transport: transportIdentifier,
      chooseDevice,
      canPromptForDevice: canPromptForDevice(),
      runAction: makeLedgerActionRunner(ctx, appName),
    });
    try {
      throwIfOperationAborted(ctx.signal);
      if (request.chain === 'stacks')
        return { sessionId, ...(await connectStacksApp(getDmk(), sessionId)) };
      return { sessionId, ...(await connectBitcoinApp(getDmk(), sessionId, request.network)) };
    } catch (error) {
      await closeSession(sessionId);
      throw error;
    }
  }

  return {
    vendor: 'ledger',
    capabilities: ledgerCapabilities,

    pair(ctx) {
      return withLedgerErrors(async (): Promise<DiscoveredHardwareDevice> => {
        throwIfOperationAborted(ctx.signal);
        const sessionId = await connectLedgerDeviceToApp(getDmk(), null, {
          transport: transportIdentifier,
          chooseDevice,
          canPromptForDevice: true,
        });
        try {
          const { id, name } = getDmk().getConnectedDevice({ sessionId });
          return { id, name };
        } finally {
          await closeSession(sessionId);
        }
      });
    },

    async connect(request, ctx) {
      throwIfOperationAborted(ctx.signal);
      try {
        const { sessionId, app, signers } = await openSession(request, ctx);
        return {
          vendor: 'ledger',
          capabilities: ledgerCapabilities,
          app,
          ...signers,
          close() {
            return closeSession(sessionId);
          },
        };
      } catch (error) {
        throw toHardwareWalletError(error);
      }
    },
  };
}
