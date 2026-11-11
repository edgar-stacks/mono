import { initServicesContainer } from '@leather.io/services';

import { InMemoryHttpCacheService } from './in-memory-http-cache.service';
import { McpSettingsService } from './mcp-settings.service';

export function initMcpServices() {
  initServicesContainer({
    env: { environment: 'production' },
    settingsService: McpSettingsService,
    cacheService: InMemoryHttpCacheService,
  });
}
