import {
  CommandResultFactory,
  DeviceActionStatus,
  DeviceLockedError,
  type DeviceManagementKit,
  DeviceModel,
  DeviceModelId,
  type DiscoveredDevice,
  type OpenAppDAState,
  type TransportFactory,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import type * as ZondaxLedgerStacks from '@zondax/ledger-stacks';
import { LedgerError } from '@zondax/ledger-stacks';
import { of } from 'rxjs';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { makeFakeDmk } from '../dmk/ledger-dmk.test-utils';
import { createLedgerConnector } from './ledger-connector';

const mocks = vi.hoisted(() => ({
  buildLedgerDmk: vi.fn(),
  stacksGetVersion: vi.fn(),
}));

vi.mock('../dmk/ledger-dmk', () => ({ buildLedgerDmk: mocks.buildLedgerDmk }));

vi.mock('@zondax/ledger-stacks', async importOriginal => {
  const original = await importOriginal<typeof ZondaxLedgerStacks>();
  return {
    ...original,
    default: vi.fn(() => ({ getVersion: mocks.stacksGetVersion })),
  };
});

const sessionId = 'session-1';
const transportIdentifier = 'WEB-HID';
const transportFactory: TransportFactory = vi.fn();

const device: DiscoveredDevice = {
  id: 'device-1',
  name: 'Nano S Plus',
  deviceModel: new DeviceModel({
    id: 'nanoSP',
    model: DeviceModelId.NANO_SP,
    name: 'Ledger Nano S Plus',
  }),
  transport: transportIdentifier,
};

const completedOpenApp: OpenAppDAState = {
  status: DeviceActionStatus.Completed,
  output: undefined,
};

const confirmOpenApp: OpenAppDAState = {
  status: DeviceActionStatus.Pending,
  intermediateValue: {
    requiredUserInteraction: UserInteractionRequired.ConfirmOpenApp,
    step: 'os.openApp.steps.confirmOpenApp',
  },
};

interface ConnectingDmkOptions {
  grantedDevices?: DiscoveredDevice[];
  openAppStates?: OpenAppDAState[];
  runningApp?: string;
}

function makeConnectingDmk({
  grantedDevices = [device],
  openAppStates = [completedOpenApp],
  runningApp = 'Bitcoin',
}: ConnectingDmkOptions = {}): DeviceManagementKit {
  return makeFakeDmk({
    listenToAvailableDevices: vi.fn().mockReturnValue(of(grantedDevices)),
    startDiscovering: vi.fn().mockReturnValue(of(device)),
    connect: vi.fn().mockResolvedValue(sessionId),
    executeDeviceAction: vi.fn().mockReturnValue({
      observable: of(...openAppStates),
      cancel: vi.fn(),
    }),
    sendCommand: vi
      .fn()
      .mockResolvedValue(
        CommandResultFactory({ data: { name: runningApp, version: '2.4.1', flags: 0 } })
      ),
    getConnectedDevice: vi.fn().mockReturnValue({ id: device.id, name: device.name }),
  });
}

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

function stringContaining(expected: string): unknown {
  return expect.stringContaining(expected);
}

function makeStacksVersion(overrides: Record<string, unknown> = {}) {
  return {
    returnCode: LedgerError.NoErrors,
    errorMessage: 'No errors',
    testMode: false,
    major: 0,
    minor: 26,
    patch: 19,
    deviceLocked: false,
    targetId: '',
    ...overrides,
  };
}

function setup(dmk: DeviceManagementKit, canPromptForDevice?: () => boolean) {
  mocks.buildLedgerDmk.mockReturnValue(dmk);
  return createLedgerConnector({ transportFactory, transportIdentifier, canPromptForDevice });
}

beforeEach(() => {
  mocks.buildLedgerDmk.mockReset();
  mocks.stacksGetVersion.mockReset();
  mocks.stacksGetVersion.mockResolvedValue(makeStacksVersion());
});

describe(createLedgerConnector.name, () => {
  test('describes the Ledger vendor and its capabilities', () => {
    const connector = setup(makeConnectingDmk());

    expect(connector.vendor).toBe('ledger');
    expect(connector.capabilities).toEqual({
      chains: ['bitcoin', 'stacks'],
      bitcoinWalletPolicies: true,
    });
  });

  describe('connect', () => {
    test('opens the Bitcoin app on the injected transport and returns a Bitcoin session', async () => {
      const dmk = makeConnectingDmk();
      const connector = setup(dmk);

      const session = await connector.connect(
        { chain: 'bitcoin', network: 'mainnet' },
        makeFakeOperationContext()
      );

      expect(mocks.buildLedgerDmk).toHaveBeenCalledWith(transportFactory);
      expect(dmk.listenToAvailableDevices).toHaveBeenCalledWith({ transport: transportIdentifier });
      expect(dmk.executeDeviceAction).toHaveBeenCalledWith(
        objectContaining({
          deviceAction: objectContaining({ input: objectContaining({ appName: 'Bitcoin' }) }),
        })
      );
      expect(session.app).toEqual({ name: 'Bitcoin', version: '2.4.1' });
      expect(session.bitcoin).not.toBeNull();
      expect(session.stacks).toBeNull();
    });

    test('builds the device management kit once', async () => {
      const connector = setup(makeConnectingDmk());

      await connector.connect({ chain: 'bitcoin', network: 'mainnet' }, makeFakeOperationContext());
      await connector.connect({ chain: 'bitcoin', network: 'mainnet' }, makeFakeOperationContext());

      expect(mocks.buildLedgerDmk).toHaveBeenCalledOnce();
    });

    test('rejects with a wrong-app error and closes the session when another app is open', async () => {
      const dmk = makeConnectingDmk({ runningApp: 'Bitcoin Test' });
      const connector = setup(dmk);

      await expect(
        connector.connect({ chain: 'bitcoin', network: 'mainnet' }, makeFakeOperationContext())
      ).rejects.toMatchObject({
        kind: 'wrong-app',
        message: stringContaining('Bitcoin app'),
      });
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('expects the Bitcoin Test app on testnet', async () => {
      const dmk = makeConnectingDmk({ runningApp: 'Bitcoin Test' });

      const session = await setup(dmk).connect(
        { chain: 'bitcoin', network: 'testnet' },
        makeFakeOperationContext()
      );

      expect(session.app?.name).toBe('Bitcoin Test');
    });

    test('opens the Stacks app and returns a Stacks session', async () => {
      const connector = setup(makeConnectingDmk());

      const session = await connector.connect({ chain: 'stacks' }, makeFakeOperationContext());

      expect(session.app).toEqual({ name: 'Stacks', version: '0.26.19' });
      expect(session.stacks).not.toBeNull();
      expect(session.bitcoin).toBeNull();
    });

    test('rejects an outdated Stacks app with the version details and closes the session', async () => {
      mocks.stacksGetVersion.mockResolvedValue(makeStacksVersion({ patch: 18 }));
      const dmk = makeConnectingDmk();

      await expect(
        setup(dmk).connect({ chain: 'stacks' }, makeFakeOperationContext())
      ).rejects.toMatchObject({
        kind: 'outdated-app',
        details: { currentVersion: '0.26.18', requiredVersion: '0.26.19' },
      });
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('rejects as locked when the Stacks app reports a locked device', async () => {
      mocks.stacksGetVersion.mockResolvedValue(makeStacksVersion({ deviceLocked: true }));

      await expect(
        setup(makeConnectingDmk()).connect({ chain: 'stacks' }, makeFakeOperationContext())
      ).rejects.toMatchObject({ kind: 'locked' });
    });

    test('reports the open-app interaction to the operation', async () => {
      const ctx = makeFakeOperationContext();

      await setup(makeConnectingDmk({ openAppStates: [confirmOpenApp, completedOpenApp] })).connect(
        { chain: 'stacks' },
        ctx
      );

      expect(ctx.onInteraction).toHaveBeenCalledWith({ type: 'open-app', appName: 'Stacks' });
    });

    test('maps a locked device while opening the app to a locked error', async () => {
      const dmk = makeConnectingDmk({
        openAppStates: [{ status: DeviceActionStatus.Error, error: new DeviceLockedError() }],
      });

      await expect(
        setup(dmk).connect({ chain: 'stacks' }, makeFakeOperationContext())
      ).rejects.toMatchObject({ kind: 'locked' });
    });

    test('rejects as not paired when it cannot prompt for a device', async () => {
      const dmk = makeConnectingDmk({ grantedDevices: [] });

      await expect(
        setup(dmk, () => false).connect({ chain: 'stacks' }, makeFakeOperationContext())
      ).rejects.toMatchObject({ kind: 'not-paired' });
      expect(dmk.startDiscovering).not.toHaveBeenCalled();
    });

    test('does not touch the device once the operation is aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        setup(makeConnectingDmk()).connect(
          { chain: 'stacks' },
          makeFakeOperationContext({ signal: controller.signal })
        )
      ).rejects.toMatchObject({ kind: 'cancelled' });
      expect(mocks.buildLedgerDmk).not.toHaveBeenCalled();
    });

    test('closes the device session when the session is closed', async () => {
      const dmk = makeConnectingDmk();
      const session = await setup(dmk).connect({ chain: 'stacks' }, makeFakeOperationContext());

      await session.close();

      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('reports a failure to close the session instead of throwing', async () => {
      const closeError = new Error('already closed');
      const dmk = makeConnectingDmk();
      dmk.disconnect = vi.fn().mockRejectedValue(closeError);
      const onSessionCloseError = vi.fn();
      mocks.buildLedgerDmk.mockReturnValue(dmk);
      const connector = createLedgerConnector({
        transportFactory,
        transportIdentifier,
        onSessionCloseError,
      });
      const session = await connector.connect({ chain: 'stacks' }, makeFakeOperationContext());

      await expect(session.close()).resolves.toBeUndefined();
      expect(onSessionCloseError).toHaveBeenCalledWith(closeError);
    });
  });

  describe('pair', () => {
    test('prompts for a device, returns it and closes the session', async () => {
      const dmk = makeConnectingDmk({ grantedDevices: [] });

      await expect(setup(dmk, () => false).pair(makeFakeOperationContext())).resolves.toEqual({
        id: device.id,
        name: device.name,
      });

      expect(dmk.startDiscovering).toHaveBeenCalledWith({ transport: transportIdentifier });
      expect(dmk.executeDeviceAction).not.toHaveBeenCalled();
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('maps a dismissed device chooser to a no-device-selected error', async () => {
      const dmk = makeConnectingDmk({ grantedDevices: [] });
      dmk.connect = vi.fn().mockRejectedValue({ _tag: 'NoAccessibleDeviceError' });

      await expect(setup(dmk).pair(makeFakeOperationContext())).rejects.toMatchObject({
        kind: 'no-device-selected',
      });
    });
  });
});
