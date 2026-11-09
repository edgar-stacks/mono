import type { CDPSession, Page } from '@playwright/test';

export interface BiometricAuthenticator {
  remove(): Promise<void>;
}

export async function addBiometricAuthenticator(page: Page): Promise<BiometricAuthenticator> {
  const client: CDPSession = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      hasPrf: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  return {
    async remove() {
      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
      await client.send('WebAuthn.disable');
      await client.detach();
    },
  };
}
