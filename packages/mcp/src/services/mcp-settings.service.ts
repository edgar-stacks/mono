import { defaultNetworksKeyedById } from '@leather.io/models';
import { type SettingsService, type UserSettings } from '@leather.io/services';

import { MCP_NETWORK } from '../constants';

export class McpSettingsService implements SettingsService {
  getSettings(): UserSettings {
    return {
      network: defaultNetworksKeyedById[MCP_NETWORK],
      quoteCurrency: 'USD',
      assetVisibility: {},
    };
  }
}
