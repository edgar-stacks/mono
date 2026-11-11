import { base64urlnopad } from '@scure/base';
import { bytesToHex, hexToBytes } from '@stacks/common';
import { z } from 'zod';

const platformUnlockConfigVersion = 1;
const platformUnlockAadPrefix = 'leather-platform-unlock-v1';
const prfOutputByteLength = 32;
const prfInputByteLength = 32;
const ivByteLength = 12;
const registrationTagByteLength = 9;
const walletEncryptionKeyByteLength = 48;
const aesGcmTagByteLength = 16;
const wrappedEncryptionKeyByteLength = walletEncryptionKeyByteLength + aesGcmTagByteLength;
const minCredentialIdByteLength = 16;
const maxCredentialIdByteLength = 1023;
const walletEncryptionKeyPattern = /^[0-9a-f]{96}$/;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export function encodeBase64Url(bytes: Uint8Array) {
  return base64urlnopad.encode(bytes);
}

export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!base64UrlPattern.test(value)) return null;
  try {
    const bytes = base64urlnopad.decode(value);
    if (base64urlnopad.encode(bytes) !== value) return null;
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

function canonicalBase64UrlField(isValidLength: (byteLength: number) => boolean) {
  return z.string().refine(value => {
    const bytes = decodeBase64Url(value);
    return bytes !== null && isValidLength(bytes.byteLength);
  }, 'Invalid base64url value');
}

export const platformUnlockConfigSchema = z.strictObject({
  version: z.literal(platformUnlockConfigVersion),
  credentialId: canonicalBase64UrlField(
    length => length >= minCredentialIdByteLength && length <= maxCredentialIdByteLength
  ),
  prfInput: canonicalBase64UrlField(length => length === prfInputByteLength),
  registrationTag: canonicalBase64UrlField(length => length === registrationTagByteLength),
  iv: canonicalBase64UrlField(length => length === ivByteLength),
  wrappedEncryptionKey: canonicalBase64UrlField(
    length => length === wrappedEncryptionKeyByteLength
  ),
});

export type PlatformUnlockConfig = z.infer<typeof platformUnlockConfigSchema>;

export function parsePlatformUnlockConfig(value: unknown): PlatformUnlockConfig | null {
  const result = platformUnlockConfigSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isWalletEncryptionKey(value: string) {
  return walletEncryptionKeyPattern.test(value);
}

function randomBytes(byteLength: number) {
  return crypto.getRandomValues(new Uint8Array(byteLength));
}

export function generateWalletEncryptionKey() {
  return bytesToHex(randomBytes(walletEncryptionKeyByteLength));
}

export function generatePlatformUnlockRegistration() {
  return {
    prfInput: encodeBase64Url(randomBytes(prfInputByteLength)),
    registrationTag: encodeBase64Url(randomBytes(registrationTagByteLength)),
  };
}

export function buildPlatformUnlockAad(credentialId: string, registrationTag: string) {
  return new TextEncoder().encode(`${platformUnlockAadPrefix}:${credentialId}:${registrationTag}`);
}

function importWrappingKey(prfOutput: Uint8Array) {
  if (prfOutput.byteLength !== prfOutputByteLength) throw new Error('Invalid PRF output length');
  return crypto.subtle.importKey('raw', new Uint8Array(prfOutput), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

interface WrapWalletEncryptionKeyArgs {
  encryptionKey: string;
  prfOutput: Uint8Array;
  credentialId: string;
  prfInput: string;
  registrationTag: string;
}
export async function wrapWalletEncryptionKey({
  encryptionKey,
  prfOutput,
  credentialId,
  prfInput,
  registrationTag,
}: WrapWalletEncryptionKeyArgs): Promise<PlatformUnlockConfig> {
  if (!isWalletEncryptionKey(encryptionKey)) throw new Error('Invalid wallet encryption key');
  const wrappingKey = await importWrappingKey(prfOutput);
  const iv = randomBytes(ivByteLength);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: buildPlatformUnlockAad(credentialId, registrationTag),
    },
    wrappingKey,
    new Uint8Array(hexToBytes(encryptionKey))
  );
  const config = parsePlatformUnlockConfig({
    version: platformUnlockConfigVersion,
    credentialId,
    prfInput,
    registrationTag,
    iv: encodeBase64Url(iv),
    wrappedEncryptionKey: encodeBase64Url(new Uint8Array(ciphertext)),
  });
  if (!config) throw new Error('Invalid platform unlock config');
  return config;
}

interface UnwrapWalletEncryptionKeyArgs {
  config: PlatformUnlockConfig;
  prfOutput: Uint8Array;
}
export async function unwrapWalletEncryptionKey({
  config,
  prfOutput,
}: UnwrapWalletEncryptionKeyArgs): Promise<string> {
  const validConfig = parsePlatformUnlockConfig(config);
  if (!validConfig) throw new Error('Invalid platform unlock config');
  const iv = decodeBase64Url(validConfig.iv);
  const wrappedEncryptionKey = decodeBase64Url(validConfig.wrappedEncryptionKey);
  if (!iv || !wrappedEncryptionKey) throw new Error('Invalid platform unlock config');
  const wrappingKey = await importWrappingKey(prfOutput);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: buildPlatformUnlockAad(validConfig.credentialId, validConfig.registrationTag),
    },
    wrappingKey,
    wrappedEncryptionKey
  );
  const encryptionKey = bytesToHex(new Uint8Array(plaintext));
  if (!isWalletEncryptionKey(encryptionKey)) throw new Error('Invalid wallet encryption key');
  return encryptionKey;
}
