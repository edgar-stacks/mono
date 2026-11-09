import type { BoxProps } from 'leather-styles/jsx';

import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';
import { Callout } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';

interface LedgerBitcoinInputLimitCalloutProps extends BoxProps {
  inputCount: number;
  maxAmount?: Money | null;
}
export function LedgerBitcoinInputLimitCallout({
  inputCount,
  maxAmount,
  ...props
}: LedgerBitcoinInputLimitCalloutProps) {
  return (
    <Callout variant="warning" title="Transaction too large for Ledger" {...props}>
      {maxAmount
        ? `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this transaction would use ${inputCount}. Send ${formatCurrency(maxAmount)} or less, or split the payment into multiple transactions.`
        : `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this PSBT has ${inputCount} inputs. Ask the requesting app to build a smaller transaction.`}
    </Callout>
  );
}
