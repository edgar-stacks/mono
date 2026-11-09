import { type Page } from '@playwright/test';

export async function addVirtualBiometricAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
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
    async remove() {
      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
      await client.send('WebAuthn.disable');
      await client.detach();
    },
  };
}
