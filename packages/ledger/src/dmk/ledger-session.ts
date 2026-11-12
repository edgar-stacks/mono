import type { DeviceManagementKit, DeviceSessionId } from '@ledgerhq/device-management-kit';

export async function closeLedgerSession(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId,
  onCloseError?: (error: unknown) => void
): Promise<void> {
  try {
    await dmk.disconnect({ sessionId });
  } catch (error) {
    onCloseError?.(error);
  }
}
