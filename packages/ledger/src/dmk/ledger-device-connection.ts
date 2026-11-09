import {
  type DeviceActionIntermediateValue,
  type DeviceManagementKit,
  type DeviceSessionId,
  type DiscoveredDevice,
  GetAppAndVersionCommand,
  type GetAppAndVersionResponse,
  OpenAppDeviceAction,
  type TransportIdentifier,
  isSuccessCommandResult,
} from '@ledgerhq/device-management-kit';
import { filter, firstValueFrom, timeout } from 'rxjs';

import {
  type LedgerDeviceActionOptions,
  runLedgerDeviceActionToCompletion,
} from './ledger-device-action';
import {
  LedgerConnectionErrors,
  isLedgerActionCancelledError,
  isLedgerDeviceDisconnectedError,
  isLedgerDeviceLockedError,
  makeLedgerDeviceNotPairedError,
  toLedgerTransportError,
} from './ledger-dmk-errors';
import { closeLedgerSession } from './ledger-session';

const grantedDeviceLookupTimeoutMs = 500;
const openAppUnlockTimeoutMs = 60_000;
const postRefreshEmissionIndex = 1;

export type ChooseLedgerDevice = (devices: DiscoveredDevice[]) => DiscoveredDevice | null;

interface ConnectLedgerDeviceOptions
  extends LedgerDeviceActionOptions<DeviceActionIntermediateValue> {
  canPromptForDevice?: boolean;
  chooseDevice?: ChooseLedgerDevice;
}

export interface LedgerDeviceConnection {
  sessionId: DeviceSessionId;
  device: DiscoveredDevice;
}

function chooseFirstDevice(devices: DiscoveredDevice[]): DiscoveredDevice | null {
  return devices[0] ?? null;
}

async function findGrantedDevice(
  dmk: DeviceManagementKit,
  transportIdentifier: TransportIdentifier,
  chooseDevice: ChooseLedgerDevice
): Promise<DiscoveredDevice | null> {
  try {
    const devices = await firstValueFrom(
      dmk.listenToAvailableDevices({ transport: transportIdentifier }).pipe(
        filter(
          (availableDevices, index) =>
            availableDevices.length > 0 || index >= postRefreshEmissionIndex
        ),
        timeout(grantedDeviceLookupTimeoutMs)
      )
    );
    return chooseDevice(devices);
  } catch {
    return null;
  }
}

async function discoverDevice(
  dmk: DeviceManagementKit,
  transportIdentifier: TransportIdentifier
): Promise<DiscoveredDevice> {
  try {
    return await firstValueFrom(dmk.startDiscovering({ transport: transportIdentifier }));
  } finally {
    await dmk.stopDiscovering();
  }
}

async function connectLedgerDevice(
  dmk: DeviceManagementKit,
  transportIdentifier: TransportIdentifier,
  canPromptForDevice: boolean,
  chooseDevice: ChooseLedgerDevice
): Promise<LedgerDeviceConnection> {
  const grantedDevice = await findGrantedDevice(dmk, transportIdentifier, chooseDevice);
  if (!grantedDevice && !canPromptForDevice) throw makeLedgerDeviceNotPairedError();
  const device = grantedDevice ?? (await discoverDevice(dmk, transportIdentifier));
  const sessionId = await dmk.connect({
    device,
    sessionRefresherOptions: { isRefresherDisabled: true },
  });
  return { sessionId, device };
}

function makeAppOpenFailedError(appName: string) {
  const error = new Error(
    `Unable to open the ${appName} app on your Ledger. Make sure it is installed on the device, approve any prompt shown there, then try again.`
  );
  error.name = LedgerConnectionErrors.AppOpenFailed;
  return error;
}

function toOpenAppError(error: unknown, appName: string): unknown {
  if (
    isLedgerActionCancelledError(error) ||
    isLedgerDeviceLockedError(error) ||
    isLedgerDeviceDisconnectedError(error)
  )
    return error;
  return makeAppOpenFailedError(appName);
}

async function openLedgerApp(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId,
  appName: string,
  options: LedgerDeviceActionOptions<DeviceActionIntermediateValue>
): Promise<void> {
  const action = dmk.executeDeviceAction({
    sessionId,
    deviceAction: new OpenAppDeviceAction({
      input: { appName, unlockTimeout: openAppUnlockTimeoutMs },
    }),
  });

  try {
    await runLedgerDeviceActionToCompletion(action, options);
  } catch (error) {
    throw toOpenAppError(error, appName);
  }
}

export async function connectLedgerDeviceToApp(
  dmk: DeviceManagementKit,
  transportIdentifier: TransportIdentifier,
  appName: string | null,
  options: ConnectLedgerDeviceOptions = {}
): Promise<LedgerDeviceConnection> {
  const {
    canPromptForDevice = true,
    chooseDevice = chooseFirstDevice,
    ...openAppOptions
  } = options;
  const connection = await connectLedgerDevice(
    dmk,
    transportIdentifier,
    canPromptForDevice,
    chooseDevice
  );
  if (appName === null) return connection;
  try {
    await openLedgerApp(dmk, connection.sessionId, appName, openAppOptions);
  } catch (error) {
    await closeLedgerSession(dmk, connection.sessionId);
    throw error;
  }
  return connection;
}

export async function getAppAndVersion(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId
): Promise<GetAppAndVersionResponse> {
  const result = await dmk.sendCommand({ sessionId, command: new GetAppAndVersionCommand() });
  if (!isSuccessCommandResult(result)) throw toLedgerTransportError(result.error);
  return result.data;
}
