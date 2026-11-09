import {
  BiometricUnlockError,
  createPlatformCredential,
  getBiometricUnlockFailureCategory,
  getPlatformCredentialUserLabel,
  getPlatformPrfOutput,
  isPlatformUnlockAvailable,
  isWebAuthnApiPresent,
} from './platform-authenticator';
import { encodeBase64Url, generatePlatformUnlockRegistration } from './platform-unlock';

class FakePublicKeyCredential {
  static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn(() => Promise.resolve(true));
  static getClientCapabilities = vi.fn(() => Promise.resolve({ 'extension:prf': true }));

  constructor(
    readonly rawId: ArrayBuffer,
    private readonly extensionResults: AuthenticationExtensionsClientOutputs
  ) {}

  getClientExtensionResults() {
    return this.extensionResults;
  }
}

const credentialIdBytes = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2]);
const credentialId = encodeBase64Url(credentialIdBytes);
const prfOutput = new Uint8Array(32).fill(3);

const credentials = {
  create: vi.fn<(options: CredentialCreationOptions) => Promise<unknown>>(),
  get: vi.fn<(options: CredentialRequestOptions) => Promise<unknown>>(),
};

function makeCredential(results: AuthenticationExtensionsClientOutputs, id = credentialIdBytes) {
  return new FakePublicKeyCredential(new Uint8Array(id).buffer, results);
}

beforeEach(() => {
  vi.stubGlobal('PublicKeyCredential', FakePublicKeyCredential);
  vi.stubGlobal('navigator', { credentials, userAgent: 'Chrome' });
  credentials.create.mockReset();
  credentials.get.mockReset();
  FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
  FakePublicKeyCredential.getClientCapabilities.mockResolvedValue({ 'extension:prf': true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(isWebAuthnApiPresent.name, () => {
  test('is true on Chromium with the WebAuthn API', () => {
    expect(isWebAuthnApiPresent()).toBe(true);
  });

  test('is false on Firefox', () => {
    vi.stubGlobal('navigator', { credentials, userAgent: 'Mozilla/5.0 Firefox/130.0' });
    expect(isWebAuthnApiPresent()).toBe(false);
  });

  test('is false without PublicKeyCredential', () => {
    vi.stubGlobal('PublicKeyCredential', undefined);
    expect(isWebAuthnApiPresent()).toBe(false);
  });
});

describe(isPlatformUnlockAvailable.name, () => {
  test('is available with a platform authenticator that supports PRF', async () => {
    await expect(isPlatformUnlockAvailable()).resolves.toBe(true);
  });

  test('is unavailable without a user-verifying platform authenticator', async () => {
    FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false);
    await expect(isPlatformUnlockAvailable()).resolves.toBe(false);
  });

  test('is unavailable when the client reports no PRF support', async () => {
    FakePublicKeyCredential.getClientCapabilities.mockResolvedValue({ 'extension:prf': false });
    await expect(isPlatformUnlockAvailable()).resolves.toBe(false);
  });

  test('is unavailable when the capability check throws', async () => {
    FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
      new Error('boom')
    );
    await expect(isPlatformUnlockAvailable()).resolves.toBe(false);
  });
});

describe(createPlatformCredential.name, () => {
  test('creates a platform credential with the settled options', async () => {
    const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
    credentials.create.mockResolvedValue(
      makeCredential({ prf: { enabled: true, results: { first: prfOutput.buffer } } })
    );

    const result = await createPlatformCredential({ prfInput, registrationTag });

    expect(result).toEqual({ credentialId, prfOutput });
    const { publicKey } = credentials.create.mock.calls[0][0];
    expect(publicKey?.rp).toEqual({ name: 'Leather' });
    expect(publicKey?.user.name).toBe(getPlatformCredentialUserLabel(registrationTag));
    expect(publicKey?.user.name).toBe(`Leather biometric unlock · ${registrationTag.slice(0, 6)}`);
    expect(publicKey?.pubKeyCredParams).toEqual([{ type: 'public-key', alg: -7 }]);
    expect(publicKey?.authenticatorSelection).toMatchObject({
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'discouraged',
    });
    expect(publicKey?.attestation).toBe('none');
    expect(publicKey?.timeout).toBe(120_000);
  });

  test('returns no PRF output when the authenticator only enables PRF', async () => {
    const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
    credentials.create.mockResolvedValue(makeCredential({ prf: { enabled: true } }));
    await expect(createPlatformCredential({ prfInput, registrationTag })).resolves.toEqual({
      credentialId,
      prfOutput: undefined,
    });
  });

  test('fails with no-prf when the provider does not enable PRF', async () => {
    const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
    credentials.create.mockResolvedValue(makeCredential({}));
    await expect(createPlatformCredential({ prfInput, registrationTag })).rejects.toMatchObject({
      category: 'no-prf',
    });
  });
});

describe(getPlatformPrfOutput.name, () => {
  const { prfInput } = generatePlatformUnlockRegistration();

  test('pins the assertion to the enrolled credential and returns the PRF output', async () => {
    credentials.get.mockResolvedValue(
      makeCredential({ prf: { results: { first: new Uint8Array(prfOutput) } } })
    );

    await expect(getPlatformPrfOutput({ credentialId, prfInput })).resolves.toEqual(prfOutput);

    const { publicKey } = credentials.get.mock.calls[0][0];
    expect(publicKey?.allowCredentials).toEqual([
      { type: 'public-key', id: new Uint8Array(credentialIdBytes) },
    ]);
    expect(publicKey?.userVerification).toBe('required');
  });

  test('fails when a different credential comes back', async () => {
    credentials.get.mockResolvedValue(
      makeCredential({ prf: { results: { first: prfOutput } } }, new Uint8Array([1, 1, 1]))
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

  test('fails when the PRF output has the wrong length', async () => {
    credentials.get.mockResolvedValue(
      makeCredential({ prf: { results: { first: new Uint8Array(16) } } })
    );
    await expect(getPlatformPrfOutput({ credentialId, prfInput })).rejects.toMatchObject({
      category: 'no-prf',
    });
  });

  test('fails with invalid-config for a malformed credential id', async () => {
    await expect(
      getPlatformPrfOutput({ credentialId: `${credentialId}=`, prfInput })
    ).rejects.toMatchObject({ category: 'invalid-config' });
    expect(credentials.get).not.toHaveBeenCalled();
  });
});

describe(getBiometricUnlockFailureCategory.name, () => {
  test('classifies errors', () => {
    expect(getBiometricUnlockFailureCategory(new BiometricUnlockError('no-prf', 'x'))).toBe(
      'no-prf'
    );
    expect(
      getBiometricUnlockFailureCategory(new DOMException('cancelled', 'NotAllowedError'))
    ).toBe('canceled');
    expect(getBiometricUnlockFailureCategory(new Error('x'))).toBe('unknown');
  });
});
