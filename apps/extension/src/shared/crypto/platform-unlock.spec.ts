import {
  decodeCanonicalBase64Url,
  encodeBase64Url,
  generatePlatformUnlockRegistration,
  generateWalletEncryptionKey,
  getRegistrationLabelTag,
  isWalletEncryptionKey,
  parsePlatformUnlockConfig,
  unwrapWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from './platform-unlock';

const credentialId = encodeBase64Url(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

function makePrfOutput(fill = 7) {
  return new Uint8Array(32).fill(fill);
}

function flipFirstCharacter(value: string) {
  const bytes = decodeCanonicalBase64Url(value);
  if (!bytes) throw new Error('Invalid test value');
  bytes[0] = bytes[0] ^ 1;
  return encodeBase64Url(bytes);
}

async function makeConfig(encryptionKey = generateWalletEncryptionKey()) {
  const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
  const config = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput: makePrfOutput(),
    credentialId,
    prfInput,
    registrationTag,
  });
  return { config, encryptionKey };
}

describe('platform unlock', () => {
  test('generates a 48-byte wallet encryption key as 96 hex characters', () => {
    const key = generateWalletEncryptionKey();
    expect(key).toMatch(/^[0-9a-f]{96}$/);
    expect(isWalletEncryptionKey(key)).toBe(true);
    expect(generateWalletEncryptionKey()).not.toBe(key);
  });

  test('round trips the wallet encryption key through wrap and unwrap', async () => {
    const { config, encryptionKey } = await makeConfig();
    expect(config.version).toBe(1);
    expect(config.credentialId).toBe(credentialId);
    expect(JSON.stringify(config)).not.toContain(encryptionKey);
    await expect(unwrapWalletEncryptionKey({ config, prfOutput: makePrfOutput() })).resolves.toBe(
      encryptionKey
    );
  });

  test('uses a fresh IV for every wrap', async () => {
    const encryptionKey = generateWalletEncryptionKey();
    const first = await makeConfig(encryptionKey);
    const second = await makeConfig(encryptionKey);
    expect(first.config.iv).not.toBe(second.config.iv);
  });

  test('rejects a wrong PRF output', async () => {
    const { config } = await makeConfig();
    await expect(
      unwrapWalletEncryptionKey({ config, prfOutput: makePrfOutput(8) })
    ).rejects.toThrow();
  });

  test('rejects a PRF output of the wrong length', async () => {
    const { config } = await makeConfig();
    await expect(
      unwrapWalletEncryptionKey({ config, prfOutput: new Uint8Array(16) })
    ).rejects.toThrow();
  });

  test('rejects a tampered IV', async () => {
    const { config } = await makeConfig();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, iv: flipFirstCharacter(config.iv) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
  });

  test('rejects a tampered ciphertext', async () => {
    const { config } = await makeConfig();
    await expect(
      unwrapWalletEncryptionKey({
        config: {
          ...config,
          wrappedEncryptionKey: flipFirstCharacter(config.wrappedEncryptionKey),
        },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
  });

  test('rejects tampered additional data', async () => {
    const { config } = await makeConfig();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, credentialId: flipFirstCharacter(config.credentialId) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, registrationTag: flipFirstCharacter(config.registrationTag) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
  });

  test('refuses to wrap a key that is not 96 hex characters', async () => {
    const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
    await expect(
      wrapWalletEncryptionKey({
        encryptionKey: 'abc',
        prfOutput: makePrfOutput(),
        credentialId,
        prfInput,
        registrationTag,
      })
    ).rejects.toThrow();
  });

  describe(parsePlatformUnlockConfig.name, () => {
    test('accepts a valid config', async () => {
      const { config } = await makeConfig();
      expect(parsePlatformUnlockConfig(config)).toEqual(config);
    });

    test('rejects padded, standard alphabet and non-canonical base64url', async () => {
      const { config } = await makeConfig();
      expect(parsePlatformUnlockConfig({ ...config, credentialId: `${credentialId}=` })).toBeNull();
      expect(parsePlatformUnlockConfig({ ...config, credentialId: 'AQIDBAUGBw+/' })).toBeNull();
      expect(parsePlatformUnlockConfig({ ...config, credentialId: 'AQIDBAUGBwh' })).toBeNull();
      expect(parsePlatformUnlockConfig({ ...config, credentialId: 'AB' })).toBeNull();
    });

    test('rejects fields of the wrong length', async () => {
      const { config } = await makeConfig();
      expect(
        parsePlatformUnlockConfig({ ...config, iv: encodeBase64Url(new Uint8Array(16)) })
      ).toBeNull();
      expect(
        parsePlatformUnlockConfig({ ...config, prfInput: encodeBase64Url(new Uint8Array(8)) })
      ).toBeNull();
    });

    test('rejects an unknown version, missing fields and extra fields', async () => {
      const { config } = await makeConfig();
      expect(parsePlatformUnlockConfig({ ...config, version: 2 })).toBeNull();
      expect(parsePlatformUnlockConfig({ ...config, iv: undefined })).toBeNull();
      expect(parsePlatformUnlockConfig({ ...config, encryptionKey: 'aa' })).toBeNull();
      expect(parsePlatformUnlockConfig(null)).toBeNull();
    });

    test('unwrap rejects a non-canonical config before decrypting', async () => {
      const { config } = await makeConfig();
      await expect(
        unwrapWalletEncryptionKey({
          config: { ...config, iv: `${config.iv}=` },
          prfOutput: makePrfOutput(),
        })
      ).rejects.toThrow('Invalid platform unlock config');
    });
  });

  test('derives a six character label tag from the registration tag', () => {
    const { registrationTag } = generatePlatformUnlockRegistration();
    expect(registrationTag).toHaveLength(12);
    expect(getRegistrationLabelTag(registrationTag)).toBe(registrationTag.slice(0, 6));
  });
});
