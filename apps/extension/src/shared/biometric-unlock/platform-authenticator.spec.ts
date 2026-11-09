import { decodeCanonicalBase64Url, encodeBase64Url } from '@shared/crypto/platform-unlock';

import { BiometricUnlockError } from './biometric-unlock-error';
import {
  createPlatformCredential,
  getPlatformPrfOutput,
  getPlatformUnlockUserLabel,
} from './platform-authenticator';

const credentialIdBytes = new Uint8Array(32).fill(7);
const credentialId = encodeBase64Url(credentialIdBytes);
const prfInput = encodeBase64Url(new Uint8Array(32).fill(1));
const prfOutput = new Uint8Array(32).fill(9);

class FakePublicKeyCredential {
  readonly type = 'public-key';
  readonly id: string;
  readonly rawId: ArrayBuffer;
  private readonly prf?: AuthenticationExtensionsPRFOutputs;

  constructor(rawId: Uint8Array, prf?: AuthenticationExtensionsPRFOutputs) {
    this.id = encodeBase64Url(rawId);
    this.rawId = Uint8Array.from(rawId).buffer;
    this.prf = prf;
  }

  getClientExtensionResults(): AuthenticationExtensionsClientOutputs {
    return this.prf ? { prf: this.prf } : {};
  }
}

interface FakeCredentialArgs {
  rawId?: Uint8Array;
  prf?: AuthenticationExtensionsPRFOutputs;
}
function fakeCredential({ rawId = credentialIdBytes, prf }: FakeCredentialArgs = {}) {
  return new FakePublicKeyCredential(rawId, prf);
}

interface CreateCredentialsApiArgs {
  created?: Credential;
  asserted?: Credential;
}
function createCredentialsApi({ created, asserted }: CreateCredentialsApiArgs) {
  return {
    create: vi.fn<(options: CredentialCreationOptions) => Promise<Credential | null>>(() =>
      Promise.resolve(created ?? null)
    ),
    get: vi.fn<(options: CredentialRequestOptions) => Promise<Credential | null>>(() =>
      Promise.resolve(asserted ?? null)
    ),
  };
}

async function expectCategory(promise: Promise<unknown>, category: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BiometricUnlockError);
  expect(error).toHaveProperty('category', category);
}

describe('platform authenticator', () => {
  beforeEach(() => {
    vi.stubGlobal('PublicKeyCredential', FakePublicKeyCredential);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe(createPlatformCredential.name, () => {
    test('creates a platform credential with the settled options', async () => {
      const credentials = createCredentialsApi({
        created: fakeCredential({ prf: { enabled: true, results: { first: prfOutput } } }),
      });

      const enrollment = await createPlatformCredential(credentials);

      expect(enrollment.credentialId).toEqual(credentialId);
      expect(enrollment.prfOutput).toEqual(prfOutput);
      expect(decodeCanonicalBase64Url(enrollment.prfInput)).toHaveLength(32);
      expect(credentials.get).not.toHaveBeenCalled();

      const userLabel = getPlatformUnlockUserLabel(enrollment.registrationTag);
      const [createOptions] = credentials.create.mock.calls[0] ?? [];
      expect(createOptions?.publicKey).toMatchObject({
        rp: { name: 'Leather' },
        user: { name: userLabel, displayName: userLabel },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
          requireResidentKey: false,
        },
        attestation: 'none',
        timeout: 120000,
      });
    });

    test('labels the credential with a six character tag', () => {
      expect(getPlatformUnlockUserLabel('abcdefghijkl')).toEqual(
        'Leather biometric unlock · abcdef'
      );
    });

    test('asserts the new credential when creation returns no PRF output', async () => {
      const credentials = createCredentialsApi({
        created: fakeCredential({ prf: { enabled: true } }),
        asserted: fakeCredential({ prf: { results: { first: prfOutput } } }),
      });

      const enrollment = await createPlatformCredential(credentials);

      expect(enrollment.prfOutput).toEqual(prfOutput);
      expect(credentials.get).toHaveBeenCalledTimes(1);
    });

    test('fails with no-prf when the provider does not enable PRF', async () => {
      const credentials = createCredentialsApi({
        created: fakeCredential({ prf: { enabled: false } }),
      });
      await expectCategory(createPlatformCredential(credentials), 'no-prf');
    });

    test('maps a cancelled prompt to canceled', async () => {
      const credentials = createCredentialsApi({});
      credentials.create.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
      await expectCategory(createPlatformCredential(credentials), 'canceled');
    });
  });

  describe(getPlatformPrfOutput.name, () => {
    test('pins allowCredentials to the enrolled credential and returns the PRF output', async () => {
      const credentials = createCredentialsApi({
        asserted: fakeCredential({ prf: { results: { first: prfOutput } } }),
      });

      await expect(getPlatformPrfOutput({ credentialId, prfInput }, credentials)).resolves.toEqual(
        prfOutput
      );

      const [getOptions] = credentials.get.mock.calls[0] ?? [];
      expect(getOptions?.publicKey).toMatchObject({
        allowCredentials: [{ type: 'public-key', id: credentialIdBytes }],
        userVerification: 'required',
        timeout: 120000,
      });
    });

    test('fails when a different credential comes back', async () => {
      const credentials = createCredentialsApi({
        asserted: fakeCredential({
          rawId: new Uint8Array(32).fill(8),
          prf: { results: { first: prfOutput } },
        }),
      });
      await expectCategory(
        getPlatformPrfOutput({ credentialId, prfInput }, credentials),
        'credential-mismatch'
      );
    });

    test('fails when no PRF output comes back', async () => {
      const credentials = createCredentialsApi({ asserted: fakeCredential() });
      await expectCategory(getPlatformPrfOutput({ credentialId, prfInput }, credentials), 'no-prf');
    });

    test('fails when the PRF output has the wrong length', async () => {
      const credentials = createCredentialsApi({
        asserted: fakeCredential({ prf: { results: { first: new Uint8Array(16) } } }),
      });
      await expectCategory(getPlatformPrfOutput({ credentialId, prfInput }, credentials), 'no-prf');
    });

    test('fails closed on a malformed credential id', async () => {
      const credentials = createCredentialsApi({});
      await expectCategory(
        getPlatformPrfOutput({ credentialId: 'AQ==', prfInput }, credentials),
        'invalid-config'
      );
      expect(credentials.get).not.toHaveBeenCalled();
    });
  });
});
