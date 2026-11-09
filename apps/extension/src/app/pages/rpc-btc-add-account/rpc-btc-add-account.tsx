import { useRef } from 'react';

import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { styled } from 'leather-styles/jsx';

import type { BondVaultLeaf } from '@leather.io/bitcoin';
import { AddressDisplayer, Approver, Button, Callout } from '@leather.io/ui';

import { closeWindow } from '@shared/utils';

import { useSwitchAccountSheet } from '@app/common/switch-account/use-switch-account-sheet-context';
import { BondSpendingConditions } from '@app/components/bond-spending-conditions';
import { CrossOriginFrameCallout } from '@app/components/cross-origin-frame-callout';
import { CurrentAccountDisplayer } from '@app/features/current-account/current-account-displayer';
import { useLedgerFlow } from '@app/features/ledger/flow/ledger-flow.context';
import { ledgerRawKeyUnsupportedMessage } from '@app/features/ledger/utils/ledger-descriptor-address';
import { useOnOriginTabClose } from '@app/routes/hooks/use-on-tab-closed';

import { policyCallout, verifyModeCalloutMessage } from '../policy-match';
import { useBtcAddAccount } from './use-btc-add-account';

const timelockedCalloutMessage =
  "Timelocked addresses can't be added to your wallet. You're only verifying the address.";

function getHeaderTitle(isTimelocked: boolean, isVerifyMode: boolean) {
  if (isTimelocked) return 'Verify timelocked address';
  return isVerifyMode ? 'Verify multisig address' : 'Add multisig account';
}

function getCalloutSubject(vaultKind: BondVaultLeaf['kind'] | undefined) {
  if (vaultKind === 'pk') return 'this timelocked address';
  if (vaultKind === 'multi') return 'this vault';
  return undefined;
}

export function RpcBtcAddAccount() {
  const {
    origin,
    name,
    descriptor,
    address,
    timelocked,
    matchStatus,
    mode,
    walletType,
    isLedgerUnsupported,
    canApprove,
    focusInitiatingTab,
    finalize,
  } = useBtcAddAccount();

  const { open: openLedgerFlow } = useLedgerFlow();
  const isFinalizingRef = useRef(false);

  useOnOriginTabClose(() => closeWindow());

  const { toggleSwitchAccount } = useSwitchAccountSheet();

  if (origin === null) {
    closeWindow();
    throw new Error('Origin is null');
  }

  async function onApprove() {
    // Ledger confirms the address on-device first; the nested flow finalizes and
    // responds to the dApp once the user approves on the device.
    if (walletType === 'ledger') {
      openLedgerFlow({
        kind: 'confirm-btc-policy-address',
        descriptor,
        address,
        async onConfirmed() {
          await finalize();
          closeWindow();
        },
      });
      return;
    }
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    await finalize();
    closeWindow();
  }

  const isVerifyMode = mode === 'verify';
  const confirmLabel = `${isVerifyMode ? 'Verify' : 'Confirm'}${walletType === 'ledger' ? ' on Ledger' : ''}`;
  const callout = policyCallout(matchStatus, 'Bitcoin', getCalloutSubject(timelocked?.vaultKind));
  const addressLabel = timelocked ? 'Timelocked address' : 'Multisig address';

  return (
    <Approver requester={origin} width="100%">
      <CrossOriginFrameCallout mb="space.03" width="100%" />
      <Approver.Header
        title={getHeaderTitle(!!timelocked, isVerifyMode)}
        onPressRequestedByLink={focusInitiatingTab}
      />
      {timelocked ? (
        <Approver.Section>
          <Callout variant="info" mt="space.03">
            {timelockedCalloutMessage}
          </Callout>
        </Approver.Section>
      ) : (
        isVerifyMode && (
          <Approver.Section>
            <Callout variant="warning" mt="space.03">
              {verifyModeCalloutMessage}
            </Callout>
          </Approver.Section>
        )
      )}
      <Approver.Section>
        <Approver.Subheader>{addressLabel}</Approver.Subheader>
        {address ? (
          <styled.div pb="space.03" data-testid={ConnectAccountSelectors.BtcAddAccountAddress}>
            <AddressDisplayer
              address={address}
              data-testid={SharedComponentsSelectors.AddressDisplayer}
            />
          </styled.div>
        ) : (
          <Callout variant="error" mt="space.03" mb="space.03">
            Could not derive the address for{' '}
            {timelocked ? 'this timelocked address' : 'this multisig account'}.
          </Callout>
        )}
      </Approver.Section>
      <Approver.Section>
        <Approver.Subheader>With account</Approver.Subheader>
        <CurrentAccountDisplayer onSelectAccount={toggleSwitchAccount} />
        <Callout variant={callout.variant} mt="space.04" mb="space.03">
          {callout.message}
        </Callout>
        {isLedgerUnsupported && (
          <Callout variant="warning" mb="space.03">
            {ledgerRawKeyUnsupportedMessage}
          </Callout>
        )}
      </Approver.Section>
      {timelocked ? (
        <Approver.Section>
          <Approver.Subheader>Spending conditions</Approver.Subheader>
          <styled.div pb="space.03">
            <BondSpendingConditions details={timelocked} />
          </styled.div>
        </Approver.Section>
      ) : (
        <Approver.Section>
          <Approver.Subheader>Account name</Approver.Subheader>
          <styled.p textStyle="caption.01" pb="space.03">
            {name}
          </styled.p>
        </Approver.Section>
      )}
      <Approver.Section>
        <Approver.Subheader>Bitcoin descriptor</Approver.Subheader>
        <styled.p textStyle="caption.01" wordBreak="break-all" pb="space.03">
          {descriptor}
        </styled.p>
      </Approver.Section>
      <Approver.Actions
        actions={[
          <Button key="deny" variant="outline" onClick={() => closeWindow()}>
            Deny
          </Button>,
          <Button
            key="confirm"
            disabled={!canApprove}
            onClick={() => void onApprove()}
            data-testid={ConnectAccountSelectors.BtcAddAccountApproveBtn}
          >
            {confirmLabel}
          </Button>,
        ]}
      />
    </Approver>
  );
}
