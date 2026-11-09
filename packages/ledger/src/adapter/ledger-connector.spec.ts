import {
  CommandResultFactory,
  DeviceActionStatus,
  DeviceModel,
  DeviceModelId,
  type DiscoveredDevice,
  type OpenAppDAState,
  type TransportFactory,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import type StacksApp from '@zondax/ledger-stacks';
import type { DMKTransport } from '@zondax/ledger-stacks';
import { of } from 'rxjs';

import { buildLedgerDmk } from '../dmk/ledger-dmk';
import { makeFakeDmk } from '../dmk/ledger-dmk.test-utils';
import { makeFakeLedgerStacksApp } from '../ledger-app.test-utils';
import * as stacksLedgerUtils from '../stacks/stacks-ledger-utils';
import { createLedgerConnector } from './ledger-connector';

vi.mock('../dmk/ledger-dmk', () => ({ buildLedgerDmk: vi.fn() }));

vi.mock('../stacks/stacks-ledger-utils', async importOriginal => ({
  ...(await importOriginal<typeof stacksLedgerUtils>()),
  createLedgerStacksApp: vi.fn(),
}));

function objectContaining(expected: Record<string, unknown>): unknown {
  return expect.objectContaining(expected);
}

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

const openAppStates: OpenAppDAState[] = [
  {
    status: DeviceActionStatus.Pending,
    intermediateValue: {
      requiredUserInteraction: UserInteractionRequired.ConfirmOpenApp,
      step: 'os.openApp.steps.confirmOpenApp',
    },
  },
  { status: DeviceActionStatus.Completed, output: undefined },
];

function setupDmk(runningAppName = 'Bitcoin', grantedDevices = [device]) {
  const dmk = makeFakeDmk({
    listenToAvailableDevices: vi.fn().mockReturnValue(of(grantedDevices)),
    startDiscovering: vi.fn().mockReturnValue(of(device)),
    connect: vi.fn().mockResolvedValue(sessionId),
    executeDeviceAction: vi
      .fn()
      .mockReturnValue({ observable: of(...openAppStates), cancel: vi.fn() }),
    sendCommand: vi
      .fn()
      .mockResolvedValue(
        CommandResultFactory({ data: { name: runningAppName, version: '2.4.1', flags: 0 } })
      ),
  });
  vi.mocked(buildLedgerDmk).mockReturnValue(dmk);
  return dmk;
}

function setupStacksApp(
  version: Partial<Awaited<ReturnType<StacksApp<DMKTransport>['getVersion']>>> = {}
) {
  vi.mocked(stacksLedgerUtils.createLedgerStacksApp).mockImplementation(() =>
    makeFakeLedgerStacksApp({
      getVersion: vi.fn().mockResolvedValue({
        returnCode: 0x9000,
        errorMessage: 'No errors',
        testMode: false,
        major: 0,
        minor: 26,
        patch: 19,
        deviceLocked: false,
        targetId: '',
        ...version,
      }),
    })
  );
}

function makeConnector(canPromptForDevice = () => true) {
  return createLedgerConnector({ transportFactory, transportIdentifier, canPromptForDevice });
}

beforeEach(() => {
  vi.mocked(buildLedgerDmk).mockReset();
  vi.mocked(stacksLedgerUtils.createLedgerStacksApp).mockReset();
});

describe(createLedgerConnector.name, () => {
  test('describes itself as a Ledger connector for Bitcoin and Stacks', () => {
    expect(makeConnector()).toMatchObject({
      vendor: 'ledger',
      capabilities: { bitcoin: true, stacks: true, bitcoinWalletPolicies: true },
    });
  });

  test('builds the device kit once with the injected transport', async () => {
    setupDmk();
    const connector = makeConnector();

    await (await connector.connect({ chain: 'bitcoin', network: 'mainnet' }, {})).close();
    await (await connector.connect({ chain: 'bitcoin', network: 'mainnet' }, {})).close();

    expect(buildLedgerDmk).toHaveBeenCalledOnce();
    expect(buildLedgerDmk).toHaveBeenCalledWith(transportFactory);
  });

  describe('pair', () => {
    test('prompts for a device, closes the session and returns the device', async () => {
      const dmk = setupDmk('BOLOS', []);

      await expect(makeConnector(() => false).pair({})).resolves.toEqual({
        id: device.id,
        name: device.name,
      });

      expect(dmk.startDiscovering).toHaveBeenCalledWith({ transport: transportIdentifier });
      expect(dmk.executeDeviceAction).not.toHaveBeenCalled();
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });
  });

  describe('connect to Bitcoin', () => {
    test('opens the Bitcoin app and returns a session with only a Bitcoin signer', async () => {
      const dmk = setupDmk('Bitcoin');
      const onInteraction = vi.fn();

      const session = await makeConnector().connect(
        { chain: 'bitcoin', network: 'mainnet' },
        { onInteraction }
      );

      expect(session).toMatchObject({
        vendor: 'ledger',
        app: { name: 'Bitcoin', version: '2.4.1' },
        stacks: null,
      });
      expect(session.bitcoin).not.toBeNull();
      expect(dmk.executeDeviceAction).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceAction: objectContaining({ input: objectContaining({ appName: 'Bitcoin' }) }),
        })
      );
      expect(onInteraction).toHaveBeenCalledWith({ type: 'open-app', appName: 'Bitcoin' });

      await session.close();
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('opens the Bitcoin Test app on testnet', async () => {
      setupDmk('Bitcoin Test');

      await expect(
        makeConnector().connect({ chain: 'bitcoin', network: 'testnet' }, {})
      ).resolves.toMatchObject({ app: { name: 'Bitcoin Test' } });
    });

    test('rejects with a wrong-app error and closes the session when another app is open', async () => {
      const dmk = setupDmk('Ethereum');

      await expect(
        makeConnector().connect({ chain: 'bitcoin', network: 'mainnet' }, {})
      ).rejects.toMatchObject({ kind: 'wrong-app' });
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('rejects as not paired when it cannot prompt and no device was granted', async () => {
      const dmk = setupDmk('Bitcoin', []);

      await expect(
        makeConnector(() => false).connect({ chain: 'bitcoin', network: 'mainnet' }, {})
      ).rejects.toMatchObject({ kind: 'not-paired' });
      expect(dmk.startDiscovering).not.toHaveBeenCalled();
    });
  });

  describe('connect to Stacks', () => {
    test('opens the Stacks app and returns a session with only a Stacks signer', async () => {
      setupDmk('Stacks');
      setupStacksApp();

      const session = await makeConnector().connect({ chain: 'stacks' }, {});

      expect(session).toMatchObject({
        app: { name: 'Stacks', version: '0.26.19' },
        bitcoin: null,
      });
      expect(session.stacks).not.toBeNull();
      expect(stacksLedgerUtils.createLedgerStacksApp).toHaveBeenCalledWith(
        expect.anything(),
        sessionId
      );
    });

    test('rejects with the versions when the Stacks app is outdated', async () => {
      const dmk = setupDmk('Stacks');
      setupStacksApp({ minor: 25, patch: 0 });

      await expect(makeConnector().connect({ chain: 'stacks' }, {})).rejects.toMatchObject({
        kind: 'outdated-app',
        details: { currentVersion: '0.25.0', requiredVersion: '0.26.19' },
      });
      expect(dmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    test('rejects as locked when the Stacks app reports a locked device', async () => {
      setupDmk('Stacks');
      setupStacksApp({ deviceLocked: true });

      await expect(makeConnector().connect({ chain: 'stacks' }, {})).rejects.toMatchObject({
        kind: 'locked',
      });
    });
  });

  test('does not touch the device once the signal has aborted', async () => {
    const dmk = setupDmk();
    const controller = new AbortController();
    controller.abort();

    await expect(
      makeConnector().connect(
        { chain: 'bitcoin', network: 'mainnet' },
        { signal: controller.signal }
      )
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(dmk.connect).not.toHaveBeenCalled();
  });
});
