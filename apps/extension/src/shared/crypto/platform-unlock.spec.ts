import {
  type PlatformUnlockConfig,
  decodeCanonicalBase64Url,
  encodeBase64Url,
  generatePrfInput,
  generateRegistrationTag,
  generateWalletEncryptionKey,
  isWalletEncryptionKey,
  parsePlatformUnlockConfig,
  unwrapWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from './platform-unlock';

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function flipFirstByte(value: string) {
  const bytes = decodeCanonicalBase64Url(value);
  if (!bytes) throw new Error('Expected canonical base64url');
  bytes[0] = bytes[0] ^ 0xff;
  return encodeBase64Url(bytes);
}

async function createWrappedConfig() {
  const encryptionKey = generateWalletEncryptionKey();
  const prfOutput = randomBytes(32);
  const config = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput,
    credentialId: encodeBase64Url(randomBytes(32)),
    prfInput: encodeBase64Url(generatePrfInput()),
    registrationTag: generateRegistrationTag(),
  });
  return { encryptionKey, prfOutput, config };
}

describe('platform unlock', () => {
  test('generates a 96 hex character wallet encryption key', () => {
    const key = generateWalletEncryptionKey();
    expect(key).toHaveLength(96);
    expect(isWalletEncryptionKey(key)).toBe(true);
    expect(generateWalletEncryptionKey()).not.toEqual(key);
  });

  test('round trips the wallet encryption key through wrap and unwrap', async () => {
    const { encryptionKey, prfOutput, config } = await createWrappedConfig();

    expect(config.version).toBe(1);
    expect(JSON.stringify(config)).not.toContain(encryptionKey);
    await expect(unwrapWalletEncryptionKey({ config, prfOutput })).resolves.toEqual(encryptionKey);
  });

  test('uses a fresh IV on every wrap', async () => {
    const first = await createWrappedConfig();
    const second = await wrapWalletEncryptionKey({
      encryptionKey: first.encryptionKey,
      prfOutput: first.prfOutput,
      credentialId: first.config.credentialId,
      prfInput: first.config.prfInput,
      registrationTag: first.config.registrationTag,
    });
    expect(second.iv).not.toEqual(first.config.iv);
  });

  test('rejects the wrong PRF output', async () => {
    const { config } = await createWrappedConfig();
    await expect(
      unwrapWalletEncryptionKey({ config, prfOutput: randomBytes(32) })
    ).rejects.toThrow();
  });

  test('rejects a PRF output of the wrong length', async () => {
    const { config, prfOutput } = await createWrappedConfig();
    await expect(
      unwrapWalletEncryptionKey({ config, prfOutput: prfOutput.slice(0, 16) })
    ).rejects.toThrow();
  });

  test.each<[string, (config: PlatformUnlockConfig) => PlatformUnlockConfig]>([
    ['IV', config => ({ ...config, iv: flipFirstByte(config.iv) })],
    [
      'ciphertext',
      config => ({ ...config, wrappedEncryptionKey: flipFirstByte(config.wrappedEncryptionKey) }),
    ],
    [
      'additional data credential id',
      config => ({ ...config, credentialId: flipFirstByte(config.credentialId) }),
    ],
    [
      'additional data registration tag',
      config => ({ ...config, registrationTag: flipFirstByte(config.registrationTag) }),
    ],
  ])('rejects a tampered %s', async (_label, tamper) => {
    const { config, prfOutput } = await createWrappedConfig();
    await expect(
      unwrapWalletEncryptionKey({ config: tamper(config), prfOutput })
    ).rejects.toThrow();
  });

  test('rejects a wallet encryption key that is not 96 hex characters', async () => {
    await expect(
      wrapWalletEncryptionKey({
        encryptionKey: 'abc',
        prfOutput: randomBytes(32),
        credentialId: encodeBase64Url(randomBytes(32)),
        prfInput: encodeBase64Url(generatePrfInput()),
        registrationTag: generateRegistrationTag(),
      })
    ).rejects.toThrow();
  });

  describe(decodeCanonicalBase64Url.name, () => {
    test('decodes canonical base64url without padding', () => {
      expect(decodeCanonicalBase64Url('AQID')).toEqual(new Uint8Array([1, 2, 3]));
      expect(decodeCanonicalBase64Url('-_8')).toEqual(new Uint8Array([251, 255]));
    });

    test.each(['AQI=', 'AQ==', '+/8', 'AQ I', 'AR', 'A'])('rejects %s', value => {
      expect(decodeCanonicalBase64Url(value)).toBeNull();
    });
  });

  describe(parsePlatformUnlockConfig.name, () => {
    test('accepts a valid config', async () => {
      const { config } = await createWrappedConfig();
      expect(parsePlatformUnlockConfig(config)).toEqual(config);
    });

    test('rejects non-canonical base64url', async () => {
      const { config } = await createWrappedConfig();
      expect(parsePlatformUnlockConfig({ ...config, iv: `${config.iv}=` })).toBeNull();
      expect(
        parsePlatformUnlockConfig({
          ...config,
          credentialId: config.credentialId.replace(/-/g, '+').replace(/_/g, '/') + '+',
        })
      ).toBeNull();
    });

    test('rejects fields of the wrong length', async () => {
      const { config } = await createWrappedConfig();
      expect(
        parsePlatformUnlockConfig({ ...config, iv: encodeBase64Url(randomBytes(16)) })
      ).toBeNull();
      expect(
        parsePlatformUnlockConfig({ ...config, prfInput: encodeBase64Url(randomBytes(16)) })
      ).toBeNull();
    });

    test('rejects unknown versions and extra fields', async () => {
      const { config } = await createWrappedConfig();
      expect(parsePlatformUnlockConfig({ ...config, version: 2 })).toBeNull();
      expect(parsePlatformUnlockConfig({ ...config, encryptionKey: 'leak' })).toBeNull();
      expect(parsePlatformUnlockConfig(null)).toBeNull();
    });

    test('rejects a config that unwrap is handed in malformed form', async () => {
      const { config, prfOutput } = await createWrappedConfig();
      await expect(
        unwrapWalletEncryptionKey({ config: { ...config, version: 2 }, prfOutput })
      ).rejects.toThrow('Invalid platform unlock config');
    });
  });
});
