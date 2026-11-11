import { type StacksTransactionWire, isTokenTransferPayload } from '@stacks/transactions';

import { Callout } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import {
  getRecipientFromStacksTransaction,
  getStacksTransactionFee,
  getTokenTransferAmount,
} from '@app/common/transactions/stacks/transaction.utils';
import { StacksAddressDisplayer } from '@app/components/address-displayer/stacks-address-displayer';
import { InfoCardRow, InfoCardSeparator } from '@app/components/info-card/info-card';

interface StxRotationDetailsProps {
  rotationTx: StacksTransactionWire;
}
export function StxRotationDetails({ rotationTx }: StxRotationDetailsProps) {
  const freshAddress = getRecipientFromStacksTransaction(rotationTx);

  return (
    <>
      <InfoCardSeparator />
      {isTokenTransferPayload(rotationTx.payload) && (
        <InfoCardRow
          title="Moving to fresh address"
          value={formatCurrency(getTokenTransferAmount(rotationTx.payload))}
        />
      )}
      {freshAddress && (
        <InfoCardRow
          title="Fresh address"
          value={<StacksAddressDisplayer address={freshAddress} />}
        />
      )}
      <InfoCardRow title="Second fee" value={formatCurrency(getStacksTransactionFee(rotationTx))} />
      <Callout variant="info" title="This sends two transactions" mt="space.04">
        You approve the send first, then the move. Stacked STX, tokens, NFTs and BNS names stay at
        your current address. You switch to the new account after both are sent.
      </Callout>
    </>
  );
}
