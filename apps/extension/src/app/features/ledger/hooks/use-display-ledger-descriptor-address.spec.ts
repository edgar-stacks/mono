import { HDKey } from '@scure/bip32';

import type { HardwareWalletInteraction, OperationContext } from '@leather.io/ledger';
import { makeFakeHardwareBitcoinSigner } from '@leather.io/ledger/test-utils';

import { useDisplayLedgerDescriptorAddress } from './use-display-ledger-descriptor-address';

const mocks = vi.hoisted(() => ({
  toDeviceBusyStep: vi.fn(),
}));

vi.mock('../flow/ledger-flow.context', () => ({
  useLedgerSteps: () => ({ toDeviceBusyStep: mocks.toDeviceBusyStep }),
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks', () => ({
  useCurrentNativeSegwitAccount: () => ({
    keychain: accountKeychain,
    xpub: accountKeychain.publicExtendedKey,
    keyOrigin: accountKeyOrigin,
  }),
}));

function makeNativeSegwitAccountKeychain(seedByte: number) {
  return HDKey.fromMasterSeed(new Uint8Array(32).fill(seedByte)).derive("m/84'/0'/0'");
}

const masterFingerprintHex = 'deadbeef';
const accountKeyOrigin = `${masterFingerprintHex}/84'/0'/0'`;
const accountKeychain = makeNativeSegwitAccountKeychain(1);
const cosignerXpub = makeNativeSegwitAccountKeychain(2).publicExtendedKey;
const vaultDescriptor = `wsh(multi(2,${cosignerXpub}/1/7,${accountKeychain.publicExtendedKey}/1/7))`;
const deviceAddress = 'bc1qdeviceaddress';

function makeSigner(interactions: HardwareWalletInteraction[] = []) {
  return makeFakeHardwareBitcoinSigner({
    showAddress: vi.fn((_args, ctx: OperationContext) => {
      interactions.forEach(interaction => ctx.onInteraction?.(interaction));
      return Promise.resolve(deviceAddress);
    }),
  });
}

describe(useDisplayLedgerDescriptorAddress.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('displays the wallet policy address at the descriptor key path index', async () => {
    const signer = makeSigner();
    const controller = new AbortController();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    const address = await displayAddress(signer, { signal: controller.signal }, vaultDescriptor);

    expect(address).toBe(deviceAddress);
    expect(signer.showAddress).toHaveBeenCalledWith(
      {
        kind: 'policy',
        policyDescriptor: `wsh(multi(2,${cosignerXpub}/1/7,[${accountKeyOrigin}]${accountKeychain.publicExtendedKey}/1/7))`,
        changeIndex: 1,
        addressIndex: 7,
      },
      expect.objectContaining({ signal: controller.signal })
    );
  });

  test('shows the register prompt and restores the caller screen once registered', async () => {
    const onWalletRegistered = vi.fn();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    await displayAddress(
      makeSigner([{ type: 'approve-policy' }, { type: 'verify-address' }]),
      {},
      vaultDescriptor,
      { onWalletRegistered }
    );

    expect(mocks.toDeviceBusyStep).toHaveBeenCalledWith(
      'Approve the Leather wallet policy on your Ledger…'
    );
    expect(onWalletRegistered).toHaveBeenCalledOnce();
  });

  test('fails fast when a co-signer is a raw public key', async () => {
    const rawKey = makeNativeSegwitAccountKeychain(2).deriveChild(0).deriveChild(0).publicKey;
    if (!rawKey) throw new Error('Expected public key');
    const rawKeyDescriptor = `wsh(multi(2,${Buffer.from(rawKey).toString('hex')},${accountKeychain.publicExtendedKey}/0/0))`;
    const signer = makeSigner();
    const displayAddress = useDisplayLedgerDescriptorAddress();

    await expect(displayAddress(signer, {}, rawKeyDescriptor)).rejects.toThrow(
      'another signer is a raw public key'
    );
    expect(signer.showAddress).not.toHaveBeenCalled();
  });
});
