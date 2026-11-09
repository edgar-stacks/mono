import type { StacksProtocolAction } from '@leather.io/models';

import {
  buildBlockchainActivityActionTitle,
  interpolateActivityTemplate,
} from './blockchain-activity-copy';
import type {
  BlockchainActivityTranslate,
  BlockchainActivityView,
} from './blockchain-activity-view.types';

export interface BlockchainActivityHeroLines {
  title: string;
  subtitle?: string;
}

const transferHeroTemplates: Partial<Record<StacksProtocolAction, string>> = {
  send: 'Send {asset}',
  receive: 'Receive {asset}',
};

const emptyHeroTitle = '—';

export function buildBlockchainActivityHeroLines(
  view: BlockchainActivityView,
  t: BlockchainActivityTranslate = interpolateActivityTemplate
): BlockchainActivityHeroLines {
  const actionTitle = buildBlockchainActivityActionTitle(view.action, t);
  if (actionTitle) {
    return {
      title: actionTitle,
      ...(view.protocolName
        ? { subtitle: t('via {protocol}', { protocol: view.protocolName }) }
        : {}),
    };
  }
  const transferTemplate = transferHeroTemplates[view.action];
  if (transferTemplate && view.title) return { title: t(transferTemplate, { asset: view.title }) };
  return { title: view.title || emptyHeroTitle, subtitle: view.subtitle };
}
