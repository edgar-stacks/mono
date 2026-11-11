import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  PlatformUnlockError,
  createPlatformCredential,
  getPlatformPrfOutput,
  getPlatformUnlockFailureCategory,
  getPlatformUnlockUserLabel,
  isPlatformUnlockAvailable,
} from './platform-authenticator';
import { encodeBase64Url } from './platform-unlock';

const rawCredentialId = new Uint8Array(32).fill(9);
const credentialId = encodeBase64Url(rawCredentialId);
const prfInput = encodeBase64Url(new Uint8Array(32).fill(3));
const registrationTag = encodeBase64Url(new Uint8Array(9).fill(4));

interface FakeExtensionResults {
  prf?: { enabled?: boolean; results?: { first: BufferSource } };
}

class FakePublicKeyCredential {
  static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn(() => Promise.resolve(true));
  static getClientCapabilities = vi.fn(() => Promise.resolve({ 'extension:prf': true }));

  constructor(
    readonly rawId: ArrayBuffer,
    private readonly extensionResults: FakeExtensionResults
  ) {}

  getClientExtensionResults() {
    return this.extensionResults;
  }
}

const credentials = {
  create: vi.fn<(options: CredentialCreationOptions) => Promise<unknown>>(),
  get: vi.fn<(options: CredentialRequestOptions) => Promise<unknown>>(),
};

function getCreateOptions() {
  const options = credentials.create.mock.calls[0]?.[0].publicKey;
  if (!options) throw new Error('Expected credential creation options');
  return options;
}

function getRequestOptions() {
  const options = credentials.get.mock.calls[0]?.[0].publicKey;
  if (!options) throw new Error('Expected credential request options');
  return options;
}

function makeCredential(extensionResults: FakeExtensionResults, rawId = rawCredentialId) {
  return new FakePublicKeyCredential(new Uint8Array(rawId).buffer, extensionResults);
}

describe('platform authenticator', () => {
  beforeEach(() => {
    vi.stubGlobal('PublicKeyCredential', FakePublicKeyCredential);
    vi.stubGlobal('navigator', { credentials });
    credentials.create.mockReset();
    credentials.get.mockReset();
    FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
    FakePublicKeyCredential.getClientCapabilities.mockResolvedValue({ 'extension:prf': true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe(isPlatformUnlockAvailable.name, () => {
    test('is available with a user-verifying platform authenticator', async () => {
      await expect(isPlatformUnlockAvailable()).resolves.toBe(true);
    });

    test('is unavailable without WebAuthn', async () => {
      vi.stubGlobal('PublicKeyCredential', undefined);
      await expect(isPlatformUnlockAvailable()).resolves.toBe(false);
    });

    test('is unavailable when the browser reports no PRF support', async () => {
      FakePublicKeyCredential.getClientCapabilities.mockResolvedValue({ 'extension:prf': false });
      await expect(isPlatformUnlockAvailable()).resolves.toBe(false);
    });

    test('is unavailable without a platform authenticator', async () => {
      FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
        false
      );
      await expect(isPlatformUnlockAvailable()).resolves.toBe(false);
    });
  });

  describe(createPlatformCredential.name, () => {
    test('creates a platform credential with the required options', async () => {
      const prfOutput = new Uint8Array(32).fill(5);
      credentials.create.mockResolvedValue(
        makeCredential({ prf: { enabled: true, results: { first: prfOutput } } })
      );

      const result = await createPlatformCredential({ prfInput, registrationTag });

      expect(result).toEqual({ credentialId, prfOutput });
      const options = getCreateOptions();
      expect(options.authenticatorSelection).toEqual({
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
        requireResidentKey: false,
      });
      expect(options.attestation).toBe('none');
      expect(options.timeout).toBe(120_000);
      expect(options.pubKeyCredParams).toEqual([{ type: 'public-key', alg: -7 }]);
      expect(options.rp).toEqual({ name: 'Leather' });
      expect(options.user.name).toBe(getPlatformUnlockUserLabel(registrationTag));
      expect(options.user.name).toBe(`Leather biometric unlock · ${registrationTag.slice(0, 6)}`);
    });

    test('returns no PRF output when the authenticator only enables PRF', async () => {
      credentials.create.mockResolvedValue(makeCredential({ prf: { enabled: true } }));
      await expect(createPlatformCredential({ prfInput, registrationTag })).resolves.toEqual({
        credentialId,
        prfOutput: null,
      });
    });

    test('fails with no-prf when the provider does not support PRF', async () => {
      credentials.create.mockResolvedValue(makeCredential({}));
      await expect(createPlatformCredential({ prfInput, registrationTag })).rejects.toMatchObject({
        category: 'no-prf',
      });
    });
  });

  describe(getPlatformPrfOutput.name, () => {
    test('pins the enrolled credential and returns the PRF output', async () => {
      const prfOutput = new Uint8Array(32).fill(6);
      credentials.get.mockResolvedValue(
        makeCredential({ prf: { results: { first: prfOutput.buffer } } })
      );

      await expect(getPlatformPrfOutput({ credentialId, prfInput })).resolves.toEqual(prfOutput);
      const options = getRequestOptions();
      expect(options.userVerification).toBe('required');
      expect(options.allowCredentials).toHaveLength(1);
      expect(options.allowCredentials?.[0]?.id).toEqual(rawCredentialId);
    });

    test('fails when a different credential answers', async () => {
      credentials.get.mockResolvedValue(
        makeCredential(
          { prf: { results: { first: new Uint8Array(32) } } },
          new Uint8Array(32).fill(1)
        )
      );
      await expect(getPlatformPrfOutput({ credentialId, prfInput })).rejects.toMatchObject({
        category: 'credential-mismatch',
      });
    });

    test('fails when no PRF output comes back', async () => {
      credentials.get.mockResolvedValue(makeCredential({}));
      await expect(getPlatformPrfOutput({ credentialId, prfInput })).rejects.toMatchObject({
        category: 'no-prf',
      });
    });

    test('fails with invalid-config for a non-canonical credential id', async () => {
      await expect(
        getPlatformPrfOutput({ credentialId: `${credentialId}=`, prfInput })
      ).rejects.toMatchObject({ category: 'invalid-config' });
      expect(credentials.get).not.toHaveBeenCalled();
    });
  });

  describe(getPlatformUnlockFailureCategory.name, () => {
    test('maps errors to failure categories', () => {
      expect(getPlatformUnlockFailureCategory(new PlatformUnlockError('no-prf'))).toBe('no-prf');
      expect(getPlatformUnlockFailureCategory(new DOMException('x', 'NotAllowedError'))).toBe(
        'canceled'
      );
      expect(getPlatformUnlockFailureCategory(new DOMException('x', 'NotSupportedError'))).toBe(
        'unavailable'
      );
      expect(getPlatformUnlockFailureCategory(new Error('x'))).toBe('unknown');
    });
  });
});
