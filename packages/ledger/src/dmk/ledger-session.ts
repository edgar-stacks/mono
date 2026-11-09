import type { DeviceManagementKit, DeviceSessionId } from '@ledgerhq/device-management-kit';

export async function closeLedgerSession(
  dmk: DeviceManagementKit,
  sessionId: DeviceSessionId
): Promise<void> {
  try {
    await dmk.disconnect({ sessionId });
  } catch {
    return;
  }
}
