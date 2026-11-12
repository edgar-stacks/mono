import { webHidIdentifier, webHidTransportFactory } from '@ledgerhq/device-transport-kit-web-hid';

import { createLedgerConnector } from '@leather.io/ledger';

import { logger } from '@shared/logger';

import { isPopupMode } from '@app/common/utils';

export function createExtensionLedgerConnector() {
  return createLedgerConnector({
    transportFactory: webHidTransportFactory,
    transportIdentifier: webHidIdentifier,
    canPromptForDevice() {
      return !isPopupMode();
    },
    onSessionCloseError(error) {
      logger.warn('Failed to close the Ledger device session', error);
    },
  });
}
