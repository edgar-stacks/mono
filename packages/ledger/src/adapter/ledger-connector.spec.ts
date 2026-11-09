import {
  CommandResultFactory,
  DeviceActionStatus,
  type DeviceManagementKit,
  DeviceModel,
  DeviceModelId,
  type DiscoveredDevice,
  type TransportFactory,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import { LedgerError } from '@zondax/ledger-stacks';
import { of } from 'rxjs';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { makeFakeDmk } from '../dmk/ledger-dmk.test-utils';
import { makeFakeLedgerStacksApp } from '../ledger-app.test-utils';
import { createLedgerConnector } from './ledger-connector';

const mocks = vi.hoisted(() => ({
  buildLedgerDmk: vi.fn(),
  createLedgerStacksApp: vi.fn(),
}));

vi.mock('../dmk/ledger-dmk', () => ({ buildLedgerDmk: mocks.buildLedgerDmk }));

vi.mock('../stacks/stacks-ledger-utils', async importOriginal => ({
  ...(await importOriginal<object>()),
  createLedgerStacksApp: mocks.createLedgerStacksApp,
}));

const sessionId = 'session-1';
const transportIdentifier = 'WEB-HID';

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

function makeConnectedDmk(appName = 'Bitcoin'): DeviceManagementKit {
  return makeFakeDmk({
    listenToAvailableDevices: vi.fn().mockReturnValue(of([device])),
    connect: vi.fn().mockResolvedValue(sessionId),
    executeDeviceAction: vi.fn().mockReturnValue({
      observable: of(
        {
          status: DeviceActionStatus.Pending,
          intermediateValue: { requiredUserInteraction: UserInteractionRequired.ConfirmOpenApp },
        },
        { status: DeviceActionStatus.Completed, output: undefined }
      ),
      cancel: vi.fn(),
    }),
    sendCommand: vi
      .fn()
      .mockResolvedValue(
        CommandResultFactory({ data: { name: appName, version: '2.1.0', flags: 0 } })
      ),
    getConnectedDevice: vi.fn().mockReturnValue({ id: device.id, name: device.name }),
  });
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

const transportFactory: TransportFactory = vi.fn();

function makeConnector(canPromptForDevice?: () => boolean) {
  return createLedgerConnector({ transportFactory, transportIdentifier, canPromptForDevice });
}

beforeEach(() => {
  mocks.buildLedgerDmk.mockReset();
  mocks.createLedgerStacksApp.mockReset();
});

describe(createLedgerConnector.name, () => {
  test('builds the device management kit once from the injected transport', async () => {
    const dmk = makeConnectedDmk();
    mocks.buildLedgerDmk.mockReturnValue(dmk);
    const connector = makeConnector();

    await connector.pair(makeFakeOperationContext());
    await connector.pair(makeFakeOperationContext());

    expect(mocks.buildLedgerDmk).toHaveBeenCalledOnce();
    expect(mocks.buildLedgerDmk).toHaveBeenCalledWith(transportFactory);
    expect(dmk.listenToAvailableDevices).toHaveBeenCalledWith({ transport: transportIdentifier });
  });

  test('pairs a device and closes the pairing session', async () => {
    const dmk = makeConnectedDmk();
    mocks.buildLedgerDmk.mockReturnValue(dmk);

    await expect(makeConnector().pair(makeFakeOperationContext())).resolves.toEqual({
      id: device.id,
      name: device.name,
      vendor: 'ledger',
    });
    expect(dmk.executeDeviceAction).not.toHaveBeenCalled();
    expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
  });

  test('connects a Bitcoin session with a Bitcoin signer and reports the open app prompt', async () => {
    const dmk = makeConnectedDmk('Bitcoin');
    mocks.buildLedgerDmk.mockReturnValue(dmk);
    const onInteraction = vi.fn();

    const session = await makeConnector().connect(
      { chain: 'bitcoin', network: 'mainnet' },
      makeFakeOperationContext({ onInteraction })
    );

    expect(session.wallet).toMatchObject({
      vendor: 'ledger',
      app: { name: 'Bitcoin', version: '2.1.0' },
      stacks: null,
    });
    expect(session.wallet.bitcoin).not.toBeNull();
    expect(onInteraction).toHaveBeenCalledWith({ type: 'open-app', appName: 'Bitcoin' });
    expect(dmk.disconnect).not.toHaveBeenCalled();

    await session.close();

    expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
  });

  test('rejects as wrong app and closes the session when another app is open', async () => {
    const dmk = makeConnectedDmk('Bitcoin');
    mocks.buildLedgerDmk.mockReturnValue(dmk);

    await expect(
      makeConnector().connect({ chain: 'bitcoin', network: 'testnet' }, makeFakeOperationContext())
    ).rejects.toMatchObject({ kind: 'wrong-app' });
    expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
  });

  test('rejects as not paired when it cannot prompt for a device', async () => {
    const dmk = makeConnectedDmk();
    dmk.listenToAvailableDevices = vi.fn().mockReturnValue(of([], []));
    mocks.buildLedgerDmk.mockReturnValue(dmk);

    await expect(
      makeConnector(() => false).connect({ chain: 'stacks' }, makeFakeOperationContext())
    ).rejects.toMatchObject({ kind: 'not-paired' });
    expect(dmk.startDiscovering).not.toHaveBeenCalled();
  });

  test('connects a Stacks session with a Stacks signer', async () => {
    mocks.buildLedgerDmk.mockReturnValue(makeConnectedDmk('Stacks'));
    mocks.createLedgerStacksApp.mockReturnValue(
      makeFakeLedgerStacksApp({ getVersion: vi.fn().mockResolvedValue(makeStacksVersion()) })
    );

    const session = await makeConnector().connect({ chain: 'stacks' }, makeFakeOperationContext());

    expect(session.wallet).toMatchObject({
      app: { name: 'Stacks', version: '0.26.19' },
      bitcoin: null,
    });
    expect(session.wallet.stacks).not.toBeNull();
  });

  test('rejects an outdated Stacks app with the version details and closes the session', async () => {
    const dmk = makeConnectedDmk('Stacks');
    mocks.buildLedgerDmk.mockReturnValue(dmk);
    mocks.createLedgerStacksApp.mockReturnValue(
      makeFakeLedgerStacksApp({
        getVersion: vi.fn().mockResolvedValue(makeStacksVersion({ minor: 24, patch: 0 })),
      })
    );

    await expect(
      makeConnector().connect({ chain: 'stacks' }, makeFakeOperationContext())
    ).rejects.toMatchObject({
      kind: 'outdated-app',
      details: { currentVersion: '0.24.0', requiredVersion: '0.26.19' },
    });
    expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
  });

  test('rejects as locked when the Stacks app reports a locked device', async () => {
    mocks.buildLedgerDmk.mockReturnValue(makeConnectedDmk('Stacks'));
    mocks.createLedgerStacksApp.mockReturnValue(
      makeFakeLedgerStacksApp({
        getVersion: vi.fn().mockResolvedValue(makeStacksVersion({ deviceLocked: true })),
      })
    );

    await expect(
      makeConnector().connect({ chain: 'stacks' }, makeFakeOperationContext())
    ).rejects.toMatchObject({ kind: 'locked' });
  });

  test('maps a locked device while opening the app', async () => {
    const dmk = makeConnectedDmk();
    dmk.executeDeviceAction = vi.fn().mockReturnValue({
      observable: of({ status: DeviceActionStatus.Error, error: { _tag: 'DeviceLockedError' } }),
      cancel: vi.fn(),
    });
    mocks.buildLedgerDmk.mockReturnValue(dmk);

    await expect(
      makeConnector().connect({ chain: 'bitcoin', network: 'mainnet' }, makeFakeOperationContext())
    ).rejects.toMatchObject({ kind: 'locked' });
  });
});
