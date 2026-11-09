import type { Money } from '@leather.io/models';
import { minusSign } from '@leather.io/utils';

import { addOperator } from './activity-balance';
import { interpolateActivityTemplate } from './blockchain-activity-copy';
import type {
  BlockchainActivityAmountCaption,
  BlockchainActivityDirection,
  BlockchainActivityTranslate,
} from './blockchain-activity-view.types';

export function getBlockchainActivityOperator(direction: BlockchainActivityDirection) {
  return direction === 'received' ? '+' : minusSign;
}

export function formatBlockchainActivityAmountCaption(
  caption: BlockchainActivityAmountCaption,
  formatCrypto: (money: Money) => string,
  t: BlockchainActivityTranslate = interpolateActivityTemplate
): string {
  if (caption.kind === 'more') return t('+{count} more', { count: String(caption.count) });
  return addOperator(
    formatCrypto(caption.crypto),
    getBlockchainActivityOperator(caption.direction)
  );
}
