import { type StacksTransactionWire, isTokenTransferPayload } from '@stacks/transactions';

import { Callout } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import {
  getRecipientFromStacksTransaction,
  getStacksTransactionFee,
  getTokenTransferAmount,
} from '@app/common/transactions/stacks/transaction.utils';
import { StacksAddressDisplayer } from '@app/components/address-displayer/stacks-address-displayer';
import { InfoCardRow } from '@app/components/info-card/info-card';

interface SendAndRotateDetailsProps {
  rotationTx: StacksTransactionWire;
}
export function SendAndRotateDetails({ rotationTx }: SendAndRotateDetailsProps) {
  if (!isTokenTransferPayload(rotationTx.payload)) return null;
  const freshAddress = getRecipientFromStacksTransaction(rotationTx);

  return (
    <>
      <InfoCardRow
        title="Moving to fresh address"
        value={formatCurrency(getTokenTransferAmount(rotationTx.payload))}
      />
      {freshAddress && (
        <InfoCardRow
          title="Fresh address"
          value={<StacksAddressDisplayer address={freshAddress} />}
        />
      )}
      <InfoCardRow title="Second fee" value={formatCurrency(getStacksTransactionFee(rotationTx))} />
      <Callout variant="info" title="This sends two transactions" mt="space.03">
        You approve the send first, then the move. Stacked STX, tokens, NFTs and BNS names stay at
        your current address. You switch to the new account after both are sent.
      </Callout>
    </>
  );
}
