import { base64urlnopad } from '@scure/base';
import { bytesToHex, hexToBytes } from '@stacks/common';
import { z } from 'zod';

const platformUnlockVersion = 1;
const additionalDataPrefix = 'leather-platform-unlock-v1';
const walletEncryptionKeyByteLength = 48;
const prfOutputByteLength = 32;
const prfInputByteLength = 32;
const registrationTagByteLength = 9;
const ivByteLength = 12;
const aesGcmTagByteLength = 16;
const wrappedEncryptionKeyByteLength = walletEncryptionKeyByteLength + aesGcmTagByteLength;
const walletEncryptionKeyPattern = /^[0-9a-f]{96}$/;

export function encodeBase64Url(bytes: Uint8Array) {
  return base64urlnopad.encode(bytes);
}

export function decodeCanonicalBase64Url(value: string): Uint8Array | null {
  try {
    const bytes = base64urlnopad.decode(value);
    return base64urlnopad.encode(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function canonicalBase64UrlField(byteLength?: number) {
  return z.string().refine(value => {
    const bytes = decodeCanonicalBase64Url(value);
    if (!bytes || bytes.length === 0) return false;
    return byteLength === undefined || bytes.length === byteLength;
  });
}

const platformUnlockConfigSchema = z.strictObject({
  version: z.literal(platformUnlockVersion),
  credentialId: canonicalBase64UrlField(),
  prfInput: canonicalBase64UrlField(prfInputByteLength),
  registrationTag: canonicalBase64UrlField(registrationTagByteLength),
  iv: canonicalBase64UrlField(ivByteLength),
  wrappedEncryptionKey: canonicalBase64UrlField(wrappedEncryptionKeyByteLength),
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

function toArrayBuffer(bytes: Uint8Array) {
  return new Uint8Array(bytes).buffer;
}

function decodeOrThrow(value: string) {
  const bytes = decodeCanonicalBase64Url(value);
  if (!bytes) throw new Error('Invalid platform unlock encoding');
  return bytes;
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

export function getRegistrationLabelTag(registrationTag: string) {
  return registrationTag.slice(0, 6);
}

function buildPlatformUnlockAdditionalData(credentialId: string, registrationTag: string) {
  return new TextEncoder().encode(`${additionalDataPrefix}:${credentialId}:${registrationTag}`);
}

async function importWrappingKey(prfOutput: Uint8Array, usage: KeyUsage) {
  if (prfOutput.length !== prfOutputByteLength) throw new Error('Invalid PRF output length');
  return crypto.subtle.importKey('raw', toArrayBuffer(prfOutput), { name: 'AES-GCM' }, false, [
    usage,
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
  const wrappingKey = await importWrappingKey(prfOutput, 'encrypt');
  const iv = randomBytes(ivByteLength);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(
        buildPlatformUnlockAdditionalData(credentialId, registrationTag)
      ),
    },
    wrappingKey,
    toArrayBuffer(hexToBytes(encryptionKey))
  );
  const config = parsePlatformUnlockConfig({
    version: platformUnlockVersion,
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
  config: unknown;
  prfOutput: Uint8Array;
}
export async function unwrapWalletEncryptionKey({
  config,
  prfOutput,
}: UnwrapWalletEncryptionKeyArgs): Promise<string> {
  const parsedConfig = parsePlatformUnlockConfig(config);
  if (!parsedConfig) throw new Error('Invalid platform unlock config');
  const wrappingKey = await importWrappingKey(prfOutput, 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(decodeOrThrow(parsedConfig.iv)),
      additionalData: toArrayBuffer(
        buildPlatformUnlockAdditionalData(parsedConfig.credentialId, parsedConfig.registrationTag)
      ),
    },
    wrappingKey,
    toArrayBuffer(decodeOrThrow(parsedConfig.wrappedEncryptionKey))
  );
  const encryptionKey = bytesToHex(new Uint8Array(plaintext));
  if (!isWalletEncryptionKey(encryptionKey)) throw new Error('Invalid wallet encryption key');
  return encryptionKey;
}
