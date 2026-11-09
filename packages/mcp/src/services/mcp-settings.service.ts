import { defaultNetworksKeyedById } from '@leather.io/models';
import { type SettingsService, type UserSettings } from '@leather.io/services';

export class McpSettingsService implements SettingsService {
  getSettings(): UserSettings {
    return {
      network: defaultNetworksKeyedById.mainnet,
      quoteCurrency: 'USD',
      assetVisibility: {},
    };
  }
}
