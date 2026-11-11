import { useRef } from 'react';

import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { styled } from 'leather-styles/jsx';

import { AddressDisplayer, Approver, Button, Callout } from '@leather.io/ui';

import { closeWindow } from '@shared/utils';

import { useSwitchAccountSheet } from '@app/common/switch-account/use-switch-account-sheet-context';
import { BondSpendingConditions } from '@app/components/bond-spending-conditions/bond-spending-conditions';
import { CrossOriginFrameCallout } from '@app/components/cross-origin-frame-callout';
import { CurrentAccountDisplayer } from '@app/features/current-account/current-account-displayer';
import { useLedgerFlow } from '@app/features/ledger/flow/ledger-flow.context';
import { ledgerRawKeyUnsupportedMessage } from '@app/features/ledger/utils/ledger-descriptor-address';
import { useOnOriginTabClose } from '@app/routes/hooks/use-on-tab-closed';

import { policyCallout, verifyModeCalloutMessage } from '../policy-match';
import { getTimelockedPolicySubject } from './timelocked-descriptor';
import { useBtcAddAccount } from './use-btc-add-account';

const timelockedVerifyCalloutMessage =
  "Timelocked addresses can't be added to your wallet. You're only verifying the address.";

interface BtcAddAccountCopy {
  title: string;
  addressLabel: string;
  addressError: string;
}

function getBtcAddAccountCopy(isTimelocked: boolean, isVerifyMode: boolean): BtcAddAccountCopy {
  if (isTimelocked)
    return {
      title: 'Verify timelocked address',
      addressLabel: 'Timelocked address',
      addressError: 'Could not derive this timelocked address.',
    };
  return {
    title: isVerifyMode ? 'Verify multisig address' : 'Add multisig account',
    addressLabel: 'Multisig address',
    addressError: 'Could not derive the address for this multisig account.',
  };
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
  const callout = timelocked
    ? policyCallout(matchStatus, 'Bitcoin', getTimelockedPolicySubject(timelocked))
    : policyCallout(matchStatus, 'Bitcoin');
  const copy = getBtcAddAccountCopy(timelocked !== null, isVerifyMode);

  return (
    <Approver requester={origin} width="100%">
      <CrossOriginFrameCallout mb="space.03" width="100%" />
      <Approver.Header title={copy.title} onPressRequestedByLink={focusInitiatingTab} />
      {timelocked ? (
        <Approver.Section>
          <Callout variant="info" mt="space.03">
            {timelockedVerifyCalloutMessage}
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
        <Approver.Subheader>{copy.addressLabel}</Approver.Subheader>
        {address ? (
          <styled.div pb="space.03">
            <AddressDisplayer
              address={address}
              data-testid={SharedComponentsSelectors.AddressDisplayer}
            />
          </styled.div>
        ) : (
          <Callout variant="error" mt="space.03" mb="space.03">
            {copy.addressError}
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
            <BondSpendingConditions
              unlockHeight={timelocked.unlockHeight}
              hash={timelocked.hash}
              counterpartyKey={timelocked.counterpartyKey}
              vaultKind={timelocked.vaultKind}
              vaultThreshold={timelocked.vaultThreshold}
              vaultKeyExpressions={timelocked.vaultKeyExpressions}
            />
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
