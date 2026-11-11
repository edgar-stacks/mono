import {
  buildPlatformUnlockAad,
  decodeBase64Url,
  encodeBase64Url,
  generatePlatformUnlockRegistration,
  generateWalletEncryptionKey,
  isWalletEncryptionKey,
  parsePlatformUnlockConfig,
  unwrapWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from './platform-unlock';

const credentialId = encodeBase64Url(new Uint8Array(32).fill(7));

function makePrfOutput(fill = 1) {
  return new Uint8Array(32).fill(fill);
}

async function wrapTestKey(prfOutput = makePrfOutput()) {
  const encryptionKey = generateWalletEncryptionKey();
  const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
  const config = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput,
    credentialId,
    prfInput,
    registrationTag,
  });
  return { encryptionKey, config };
}

function flipFirstByte(value: string) {
  const bytes = decodeBase64Url(value);
  if (!bytes) throw new Error('Expected valid base64url');
  bytes[0] = bytes[0] ^ 0xff;
  return encodeBase64Url(bytes);
}

describe('platform unlock', () => {
  test('generates a 48-byte wallet encryption key as 96 hex chars', () => {
    const encryptionKey = generateWalletEncryptionKey();
    expect(encryptionKey).toMatch(/^[0-9a-f]{96}$/);
    expect(isWalletEncryptionKey(encryptionKey)).toBe(true);
    expect(generateWalletEncryptionKey()).not.toEqual(encryptionKey);
  });

  test('wraps and unwraps the wallet encryption key with the same PRF output', async () => {
    const { encryptionKey, config } = await wrapTestKey();

    expect(config.version).toBe(1);
    expect(config.credentialId).toBe(credentialId);
    expect(decodeBase64Url(config.iv)?.byteLength).toBe(12);
    expect(JSON.stringify(config)).not.toContain(encryptionKey);
    await expect(unwrapWalletEncryptionKey({ config, prfOutput: makePrfOutput() })).resolves.toBe(
      encryptionKey
    );
  });

  test('rejects a wrong PRF output', async () => {
    const { config } = await wrapTestKey();
    await expect(
      unwrapWalletEncryptionKey({ config, prfOutput: makePrfOutput(2) })
    ).rejects.toThrow();
  });

  test('rejects a PRF output of the wrong length', async () => {
    const { config } = await wrapTestKey();
    await expect(
      unwrapWalletEncryptionKey({ config, prfOutput: new Uint8Array(16) })
    ).rejects.toThrow();
  });

  test('rejects a tampered IV', async () => {
    const { config } = await wrapTestKey();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, iv: flipFirstByte(config.iv) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
  });

  test('rejects a tampered ciphertext', async () => {
    const { config } = await wrapTestKey();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, wrappedEncryptionKey: flipFirstByte(config.wrappedEncryptionKey) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
  });

  test('rejects tampered additional data', async () => {
    const { config } = await wrapTestKey();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, registrationTag: flipFirstByte(config.registrationTag) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
    await expect(
      unwrapWalletEncryptionKey({
        config: { ...config, credentialId: flipFirstByte(config.credentialId) },
        prfOutput: makePrfOutput(),
      })
    ).rejects.toThrow();
  });

  test('binds the additional data to the credential id and registration tag', () => {
    expect(new TextDecoder().decode(buildPlatformUnlockAad('cred', 'tag'))).toBe(
      'leather-platform-unlock-v1:cred:tag'
    );
  });

  test('refuses to wrap a key that is not 96 hex chars', async () => {
    const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
    await expect(
      wrapWalletEncryptionKey({
        encryptionKey: 'abcd',
        prfOutput: makePrfOutput(),
        credentialId,
        prfInput,
        registrationTag,
      })
    ).rejects.toThrow();
  });
});

describe('base64url', () => {
  test('round trips without padding', () => {
    const bytes = new Uint8Array([251, 255, 0, 1]);
    const encoded = encodeBase64Url(bytes);
    expect(encoded).toBe('-_8AAQ');
    expect(decodeBase64Url(encoded)).toEqual(bytes);
  });

  test('rejects padding, standard base64 characters and whitespace', () => {
    expect(decodeBase64Url('-_8AAQ==')).toBeNull();
    expect(decodeBase64Url('+/8AAQ')).toBeNull();
    expect(decodeBase64Url(' -_8AAQ')).toBeNull();
    expect(decodeBase64Url('')).toBeNull();
  });

  test('rejects non-canonical trailing bits', () => {
    expect(decodeBase64Url('AQ')).toEqual(new Uint8Array([1]));
    expect(decodeBase64Url('AR')).toBeNull();
  });
});

describe(parsePlatformUnlockConfig.name, () => {
  test('accepts a valid config', async () => {
    const { config } = await wrapTestKey();
    expect(parsePlatformUnlockConfig(config)).toEqual(config);
  });

  test('rejects unknown versions, extra fields and wrong field lengths', async () => {
    const { config } = await wrapTestKey();
    expect(parsePlatformUnlockConfig({ ...config, version: 2 })).toBeNull();
    expect(parsePlatformUnlockConfig({ ...config, encryptionKey: 'leak' })).toBeNull();
    expect(
      parsePlatformUnlockConfig({ ...config, iv: encodeBase64Url(new Uint8Array(16)) })
    ).toBeNull();
    expect(
      parsePlatformUnlockConfig({ ...config, prfInput: encodeBase64Url(new Uint8Array(8)) })
    ).toBeNull();
    expect(
      parsePlatformUnlockConfig({ ...config, credentialId: `${config.credentialId}=` })
    ).toBeNull();
    expect(parsePlatformUnlockConfig(undefined)).toBeNull();
  });
});
