import type { CDPSession, Page } from '@playwright/test';

export interface BiometricAuthenticator {
  client: CDPSession;
  authenticatorId: string;
  remove(): Promise<void>;
}

export async function addBiometricAuthenticator(page: Page): Promise<BiometricAuthenticator> {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
    },
  });

  return {
    client,
    authenticatorId,
    async remove() {
      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
      await client.send('WebAuthn.disable');
    },
  };
}
