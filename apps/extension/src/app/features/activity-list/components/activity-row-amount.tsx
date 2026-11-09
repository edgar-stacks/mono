import { styled } from 'leather-styles/jsx';

import {
  type BlockchainActivityAmount,
  type BlockchainActivityIndicator,
  formatBlockchainActivityAmountCaption,
  getBlockchainActivityOperator,
} from '@leather.io/features';

import { formatCurrency } from '@app/common/currency-formatter';
import { Balance } from '@app/components/balance/balance';
import { PrivateText } from '@app/components/privacy/private-text';

function resolveValueColor(
  indicator: BlockchainActivityIndicator,
  direction: BlockchainActivityAmount['direction']
) {
  if (indicator === 'pending' || indicator === 'failed') return 'ink.text-subdued';
  if (direction === 'received') return 'green.action-primary-default';
  return 'ink.text-primary';
}

const hiddenSymbolOptions = { showCurrency: false };

interface ActivityRowAmountProps {
  amount: BlockchainActivityAmount;
  indicator: BlockchainActivityIndicator;
}

export function ActivityRowAmount({ amount, indicator }: ActivityRowAmountProps) {
  return (
    <Balance
      balance={amount.crypto ?? amount.quote}
      operator={getBlockchainActivityOperator(amount.direction)}
      formattingOptions={amount.crypto && !amount.showSymbol ? hiddenSymbolOptions : undefined}
      color={resolveValueColor(indicator, amount.direction)}
      textStyle="label.02"
      whiteSpace="nowrap"
      formatCurrency={formatCurrency}
    />
  );
}

interface ActivityRowAmountCaptionProps {
  amount: BlockchainActivityAmount;
}

export function ActivityRowAmountCaption({ amount }: ActivityRowAmountCaptionProps) {
  if (amount.caption?.kind === 'more') {
    return (
      <styled.span textStyle="caption.01" color="ink.text-subdued" whiteSpace="nowrap">
        {formatBlockchainActivityAmountCaption(amount.caption, money => formatCurrency(money))}
      </styled.span>
    );
  }
  if (amount.caption) {
    return (
      <PrivateText textStyle="caption.01" color="ink.text-subdued" whiteSpace="nowrap">
        {formatBlockchainActivityAmountCaption(amount.caption, money => formatCurrency(money))}
      </PrivateText>
    );
  }
  return (
    <Balance
      balance={amount.quote}
      color="ink.text-subdued"
      textStyle="caption.01"
      whiteSpace="nowrap"
      formatCurrency={formatCurrency}
    />
  );
}
