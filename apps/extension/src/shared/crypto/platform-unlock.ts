import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { base64urlnopad } from '@scure/base';
import { z } from 'zod';

const platformUnlockVersion = 1;
const additionalDataPrefix = 'leather-platform-unlock-v1';

const walletEncryptionKeyByteLength = 48;
const prfOutputByteLength = 32;
const prfInputByteLength = 32;
const registrationTagByteLength = 16;
const ivByteLength = 12;
const aesGcmTagByteLength = 16;
const wrappedEncryptionKeyByteLength = walletEncryptionKeyByteLength + aesGcmTagByteLength;
const minCredentialIdByteLength = 16;
const maxCredentialIdByteLength = 1023;

const walletEncryptionKeyPattern = /^[0-9a-f]{96}$/;

export function encodeBase64Url(bytes: Uint8Array) {
  return base64urlnopad.encode(bytes);
}

export function decodeCanonicalBase64Url(value: string) {
  try {
    const bytes = base64urlnopad.decode(value);
    return base64urlnopad.encode(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function canonicalBase64UrlSchema({ min, max }: { min: number; max: number }) {
  return z.string().refine(value => {
    const bytes = decodeCanonicalBase64Url(value);
    return bytes !== null && bytes.length >= min && bytes.length <= max;
  });
}

function fixedLengthBase64UrlSchema(length: number) {
  return canonicalBase64UrlSchema({ min: length, max: length });
}

const platformUnlockConfigSchema = z.strictObject({
  version: z.literal(platformUnlockVersion),
  credentialId: canonicalBase64UrlSchema({
    min: minCredentialIdByteLength,
    max: maxCredentialIdByteLength,
  }),
  prfInput: fixedLengthBase64UrlSchema(prfInputByteLength),
  registrationTag: fixedLengthBase64UrlSchema(registrationTagByteLength),
  iv: fixedLengthBase64UrlSchema(ivByteLength),
  wrappedEncryptionKey: fixedLengthBase64UrlSchema(wrappedEncryptionKeyByteLength),
});

export type PlatformUnlockConfig = z.infer<typeof platformUnlockConfigSchema>;

export function parsePlatformUnlockConfig(value: unknown): PlatformUnlockConfig | null {
  const result = platformUnlockConfigSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isWalletEncryptionKey(value: string) {
  return walletEncryptionKeyPattern.test(value);
}

export function generateWalletEncryptionKey() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(walletEncryptionKeyByteLength)));
}

export function generatePrfInput() {
  return crypto.getRandomValues(new Uint8Array(prfInputByteLength));
}

export function generateRegistrationTag() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(registrationTagByteLength)));
}

function getPlatformUnlockAdditionalData(credentialId: string, registrationTag: string) {
  return new TextEncoder().encode(`${additionalDataPrefix}:${credentialId}:${registrationTag}`);
}

function assertPrfOutput(prfOutput: Uint8Array) {
  if (prfOutput.length !== prfOutputByteLength) throw new Error('Invalid PRF output length');
}

async function importWrappingKey(prfOutput: Uint8Array, usage: 'decrypt' | 'encrypt') {
  assertPrfOutput(prfOutput);
  return crypto.subtle.importKey('raw', Uint8Array.from(prfOutput), 'AES-GCM', false, [usage]);
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
  const iv = crypto.getRandomValues(new Uint8Array(ivByteLength));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: getPlatformUnlockAdditionalData(credentialId, registrationTag),
    },
    wrappingKey,
    Uint8Array.from(hexToBytes(encryptionKey))
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
}: UnwrapWalletEncryptionKeyArgs) {
  const parsedConfig = parsePlatformUnlockConfig(config);
  if (!parsedConfig) throw new Error('Invalid platform unlock config');

  const iv = decodeCanonicalBase64Url(parsedConfig.iv);
  const wrappedEncryptionKey = decodeCanonicalBase64Url(parsedConfig.wrappedEncryptionKey);
  if (!iv || !wrappedEncryptionKey) throw new Error('Invalid platform unlock config');

  const wrappingKey = await importWrappingKey(prfOutput, 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: Uint8Array.from(iv),
      additionalData: getPlatformUnlockAdditionalData(
        parsedConfig.credentialId,
        parsedConfig.registrationTag
      ),
    },
    wrappingKey,
    Uint8Array.from(wrappedEncryptionKey)
  );

  const encryptionKey = bytesToHex(new Uint8Array(plaintext));
  if (!isWalletEncryptionKey(encryptionKey)) throw new Error('Invalid wallet encryption key');
  return encryptionKey;
}
