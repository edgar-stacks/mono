import type { BoxProps } from 'leather-styles/jsx';

import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';
import { Callout } from '@leather.io/ui';
import { satToBtc } from '@leather.io/utils';

interface LedgerBitcoinInputLimitCalloutProps extends BoxProps {
  inputCount: number;
  maxAmountWithinLimit?: Money | null;
}

export function LedgerBitcoinInputLimitCallout({
  inputCount,
  maxAmountWithinLimit,
  ...props
}: LedgerBitcoinInputLimitCalloutProps) {
  return (
    <Callout variant="warning" title="Transaction too large for Ledger" textAlign="left" {...props}>
      {maxAmountWithinLimit
        ? `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this transaction would use ${inputCount}. Send ${satToBtc(maxAmountWithinLimit.amount).toString()} BTC or less, or split the payment into multiple transactions.`
        : `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this PSBT has ${inputCount} inputs. Ask the requesting app to build a smaller transaction.`}
    </Callout>
  );
}
