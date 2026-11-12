import { useState } from 'react';
import { useNavigate } from 'react-router';

import {
  deviceMatchesLegacyLedgerWallet,
  resolveLedgerStacksDerivationPathType,
} from 'app/features/ledger/flows/request-stacks-keys/request-stacks-keys.utils';

import { createDescriptor, createKeyOriginPath } from '@leather.io/crypto';
import {
  type HardwareStacksSigner,
  type OperationContext,
  getStacksSigner,
  isHardwareWalletError,
} from '@leather.io/ledger';
import type { StacksDerivationPathType } from '@leather.io/stacks';
import { delay, makeNumberRange } from '@leather.io/utils';

import { assumedZeroFingerprint } from '@shared/utils';

import { useLedgerFlow, useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import { ChooseAddressStandard } from '@app/features/ledger/flows/request-stacks-keys/steps/choose-address-standard';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import {
  RequestKeysFlow,
  defaultNumberOfKeysToPullFromLedgerDevice,
} from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useLedgerAnalytics } from '@app/features/ledger/hooks/use-ledger-analytics.hook';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import { useToast } from '@app/features/toasts/use-toast';
import { useAppDispatch } from '@app/store';
import { activateFirstVisibleAccount } from '@app/store/active/active.actions';
import { useStacksKeychainDescriptors } from '@app/store/keychains/keychain.selectors';
import { addOrMigrateLedgerKeychains } from '@app/store/wallets/wallet.actions';
import { getAddWalletError, useWalletEntities } from '@app/store/wallets/wallet.selectors';

const derivationPathTypeLabels: Record<StacksDerivationPathType, string> = {
  stacks: 'legacy Stacks',
  bip44: 'standard (Ledger)',
};

const legacyAccountZeroIndexes = [0];

function requestLegacyAccountZeroPublicKey(signer: HardwareStacksSigner, ctx: OperationContext) {
  return async () => {
    const { keys } = await signer.requestAccountKeys(
      { derivationPathType: 'stacks', accountIndexes: legacyAccountZeroIndexes },
      ctx
    );
    const [accountZeroKey] = keys;
    return { publicKey: accountZeroKey && Buffer.from(accountZeroKey.stxPublicKey, 'hex') };
  };
}

export function LedgerRequestStacksKeys() {
  const toast = useToast();
  const navigate = useNavigate();
  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();
  const { close } = useLedgerFlow();

  const stxKeychainsDescriptors = useStacksKeychainDescriptors();
  const wallets = useWalletEntities();
  const dispatch = useAppDispatch();
  const [chosenDerivationPathType, setChosenDerivationPathType] =
    useState<StacksDerivationPathType>();

  const chain = 'stacks';

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({ chain });

  async function requestAccountKeys(
    signer: HardwareStacksSigner,
    derivationPathType: StacksDerivationPathType,
    ctx: OperationContext
  ) {
    try {
      const { keys } = await signer.requestAccountKeys(
        {
          derivationPathType,
          accountIndexes: makeNumberRange(defaultNumberOfKeysToPullFromLedgerDevice),
          onRequestKey(accountIndex) {
            ledgerNavigate.toDeviceBusyStep(
              `Requesting STX addresses (${accountIndex + 1}…${defaultNumberOfKeysToPullFromLedgerDevice})`
            );
          },
        },
        ctx
      );
      await delay(1000);
      return keys;
    } catch (error) {
      if (!isHardwareWalletError(error) || error.kind !== 'unknown') throw error;
      toast.error(error.message);
      ledgerNavigate.toErrorStep(chain, error.message);
      return null;
    }
  }

  async function pullKeysFromDevice(signer: HardwareStacksSigner, ctx: OperationContext) {
    const fingerprint = await signer.getMasterFingerprint(ctx);

    const addWalletError = getAddWalletError(wallets, fingerprint, 'ledger');
    if (addWalletError) {
      toast.error(addWalletError);
      ledgerNavigate.toErrorStep(chain, addWalletError);
      return;
    }

    const shouldProbeLegacyWallet =
      wallets[assumedZeroFingerprint]?.type === 'ledger' && !wallets[fingerprint];
    const legacyWalletMatchesDevice = shouldProbeLegacyWallet
      ? await deviceMatchesLegacyLedgerWallet(
          requestLegacyAccountZeroPublicKey(signer, ctx),
          stxKeychainsDescriptors
        )
      : false;

    const resolution = resolveLedgerStacksDerivationPathType({
      stxKeychainDescriptors: stxKeychainsDescriptors,
      fingerprint,
      hasWalletForFingerprint: Boolean(wallets[fingerprint]),
      legacyWalletMatchesDevice,
      chosenDerivationPathType,
    });

    if (resolution.status === 'needs-choice') {
      toast.info('Confirm your preferred address standard to continue');
      ledgerNavigate.toChooseAddressStandardStep({ connectImmediatelyAfter: true });
      return;
    }

    const { derivationPathType, overriddenChosenType } = resolution;

    if (overriddenChosenType) {
      toast.info(
        `This device's existing accounts use the ${derivationPathTypeLabels[derivationPathType]} address standard, so your ${derivationPathTypeLabels[overriddenChosenType]} selection couldn't be applied`
      );
    }

    const keys = await requestAccountKeys(signer, derivationPathType, ctx);
    if (!keys) return;
    ledgerNavigate.toDeviceBusyStep();

    const keychains = keys
      .map(key => {
        const keyOrigin = createKeyOriginPath(fingerprint, key.path);
        const descriptor = createDescriptor(keyOrigin, key.stxPublicKey);
        return {
          chain: 'stacks' as const,
          descriptor,
        };
      })
      .filter(keychain => {
        return !stxKeychainsDescriptors.includes(keychain.descriptor);
      });

    if (keychains.length === 0) {
      toast.info(`No new accounts found — this device's accounts are already in your wallet`);
    }

    await dispatch(addOrMigrateLedgerKeychains({ fingerprint, accountKeychains: keychains }));
    void dispatch(activateFirstVisibleAccount(fingerprint));
    ledgerAnalytics.publicKeysPulledFromLedgerSuccessfully();
    close();
    void navigate('/', { replace: true });
  }

  async function requestKeys() {
    await run((wallet, ctx) => pullKeysFromDevice(getStacksSigner(wallet), ctx));
  }

  const ledgerContextValue: LedgerRequestKeysContext = {
    chain: 'stacks',
    pullPublicKeysFromDevice: requestKeys,
    onSelectStandard: setChosenDerivationPathType,
    latestDeviceResponse,
    awaitingDeviceConnection,
  };

  const canCancelLedgerAction = useCancelLedgerAction({
    awaitingDeviceConnection,
    isConnectionCancellable,
  });
  return (
    <RequestKeysFlow
      context={ledgerContextValue}
      isActionCancellableByUser={canCancelLedgerAction}
      onCancelAction={cancel}
      renderStep={{ 'choose-address-standard': <ChooseAddressStandard /> }}
    />
  );
}
