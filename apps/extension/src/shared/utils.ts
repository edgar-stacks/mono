import { logger } from './logger';
import { RouteUrls } from './route-urls';
import { isSidePanelPage } from './side-panel/side-panel';
import { endSidePanelRequestSession } from './side-panel/side-panel-request-session';

export const assumedZeroFingerprint = '00000000';

export function closeWindow() {
  // We prevent `window.close()` directly as to allow for debugging helper
  if (process.env.DEBUG_PREVENT_WINDOW_CLOSE === 'true') {
    logger.warn('Prevented window close with flag DEBUG_PREVENT_WINDOW_CLOSE');
    return;
  }
  if (isSidePanelPage()) {
    endSidePanelRequestSession({ isHandOff: false });
    window.location.hash = RouteUrls.Home;
    return;
  }
  window.close();
}

type Ok<T> = readonly [value: T, error: null];
type Err = readonly [value: null, error: unknown];

export function safeCall<T>(fn: () => T): Ok<T> | Err {
  try {
    return [fn(), null] as const;
  } catch (e) {
    return [null, e] as const;
  }
}
