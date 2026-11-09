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
  type RunLedgerDeviceAction,
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

type ChooseLedgerDevice = (devices: DiscoveredDevice[]) => DiscoveredDevice | null;

export interface LedgerTransportOptions {
  transportIdentifier: TransportIdentifier;
  chooseDevice?: ChooseLedgerDevice;
}

interface ConnectLedgerDeviceOptions
  extends LedgerDeviceActionOptions<DeviceActionIntermediateValue> {
  runAction?: RunLedgerDeviceAction;
  canPromptForDevice?: boolean;
}

function chooseFirstDevice(devices: DiscoveredDevice[]): DiscoveredDevice | null {
  return devices[0] ?? null;
}

async function findGrantedDevice(
  dmk: DeviceManagementKit,
  { transportIdentifier, chooseDevice = chooseFirstDevice }: LedgerTransportOptions
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
  { transportIdentifier }: LedgerTransportOptions
): Promise<DiscoveredDevice> {
  try {
    return await firstValueFrom(dmk.startDiscovering({ transport: transportIdentifier }));
  } finally {
    await dmk.stopDiscovering();
  }
}

async function connectLedgerDevice(
  dmk: DeviceManagementKit,
  transport: LedgerTransportOptions,
  canPromptForDevice: boolean
): Promise<DeviceSessionId> {
  const grantedDevice = await findGrantedDevice(dmk, transport);
  if (!grantedDevice && !canPromptForDevice) throw makeLedgerDeviceNotPairedError();
  const device = grantedDevice ?? (await discoverDevice(dmk, transport));
  return dmk.connect({ device, sessionRefresherOptions: { isRefresherDisabled: true } });
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
  options: ConnectLedgerDeviceOptions
): Promise<void> {
  const action = dmk.executeDeviceAction({
    sessionId,
    deviceAction: new OpenAppDeviceAction({
      input: { appName, unlockTimeout: openAppUnlockTimeoutMs },
    }),
  });

  const { runAction = runLedgerDeviceActionToCompletion, ...actionOptions } = options;
  try {
    await runAction(action, actionOptions);
  } catch (error) {
    throw toOpenAppError(error, appName);
  }
}

export async function connectLedgerDeviceToApp(
  dmk: DeviceManagementKit,
  transport: LedgerTransportOptions,
  appName: string | null,
  options: ConnectLedgerDeviceOptions = {}
): Promise<DeviceSessionId> {
  const { canPromptForDevice = true, ...openAppOptions } = options;
  const sessionId = await connectLedgerDevice(dmk, transport, canPromptForDevice);
  if (appName === null) return sessionId;
  try {
    await openLedgerApp(dmk, sessionId, appName, openAppOptions);
  } catch (error) {
    await closeLedgerSession(dmk, sessionId);
    throw error;
  }
  return sessionId;
}

export async function getAppAndVersion(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId
): Promise<GetAppAndVersionResponse> {
  const result = await dmk.sendCommand({ sessionId, command: new GetAppAndVersionCommand() });
  if (!isSuccessCommandResult(result)) throw toLedgerTransportError(result.error);
  return result.data;
}
