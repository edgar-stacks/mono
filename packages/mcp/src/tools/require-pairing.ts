import { type McpContext } from '../context';
import { McpToolError } from './tool-result';

export function requirePairing({ pairingStore }: Pick<McpContext, 'pairingStore'>) {
  const pairing = pairingStore.get();
  if (!pairing) {
    throw new McpToolError(
      'NOT_PAIRED',
      'No Leather account is paired.',
      'Call connect_wallet and ask the user to approve the connection in Leather first.'
    );
  }
  return pairing;
}
