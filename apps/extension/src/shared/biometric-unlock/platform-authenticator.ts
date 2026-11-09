import { secondsInMs } from '@leather.io/utils';

import {
  decodeCanonicalBase64Url,
  encodeBase64Url,
  generatePrfInput,
  generateRegistrationTag,
} from '@shared/crypto/platform-unlock';

import { BiometricUnlockError, getBiometricUnlockFailureCategory } from './biometric-unlock-error';

const relyingPartyName = 'Leather';
const userLabelPrefix = 'Leather biometric unlock';
const userLabelTagLength = 6;
const es256Algorithm = -7;
const challengeByteLength = 32;
const userIdByteLength = 16;
const prfOutputByteLength = 32;
const credentialTimeoutMs = secondsInMs(120);

export type PlatformUnlockAvailability = 'available' | 'unavailable' | 'unsupported-browser';

interface CredentialsApi {
  create(options: CredentialCreationOptions): Promise<Credential | null>;
  get(options: CredentialRequestOptions): Promise<Credential | null>;
}

function getCredentialsApi(): CredentialsApi {
  return navigator.credentials;
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toBytes(source: BufferSource) {
  if (ArrayBuffer.isView(source))
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength).slice();
  return new Uint8Array(source).slice();
}

function decodeOrThrow(value: string) {
  const bytes = decodeCanonicalBase64Url(value);
  if (!bytes) throw new BiometricUnlockError('invalid-config', 'Invalid platform unlock config');
  return Uint8Array.from(bytes);
}

function readPrfOutput(credential: PublicKeyCredential) {
  const first = credential.getClientExtensionResults().prf?.results?.first;
  if (!first) return null;
  const prfOutput = toBytes(first);
  return prfOutput.length === prfOutputByteLength ? prfOutput : null;
}

function isChromiumBrowser() {
  return typeof navigator !== 'undefined' && 'userAgentData' in navigator;
}

export function isPlatformUnlockBrowser() {
  return (
    isChromiumBrowser() &&
    typeof PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  );
}

export async function getPlatformUnlockAvailability(): Promise<PlatformUnlockAvailability> {
  if (!isPlatformUnlockBrowser()) return 'unsupported-browser';
  try {
    if (typeof PublicKeyCredential.getClientCapabilities === 'function') {
      const capabilities = await PublicKeyCredential.getClientCapabilities();
      if (capabilities['extension:prf'] === false) return 'unavailable';
    }
    const hasPlatformAuthenticator =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return hasPlatformAuthenticator ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export function getPlatformUnlockUserLabel(registrationTag: string) {
  return `${userLabelPrefix} · ${registrationTag.slice(0, userLabelTagLength)}`;
}

function withBiometricUnlockErrors<T>(fn: () => Promise<T>) {
  return fn().catch((error: unknown) => {
    if (error instanceof BiometricUnlockError) throw error;
    throw new BiometricUnlockError(
      getBiometricUnlockFailureCategory(error),
      'Platform authenticator request failed',
      { cause: error }
    );
  });
}

interface GetPlatformPrfOutputArgs {
  credentialId: string;
  prfInput: string;
}
export function getPlatformPrfOutput(
  { credentialId, prfInput }: GetPlatformPrfOutputArgs,
  credentials: CredentialsApi = getCredentialsApi()
) {
  return withBiometricUnlockErrors(async () => {
    const assertion = await credentials.get({
      publicKey: {
        challenge: randomBytes(challengeByteLength),
        allowCredentials: [{ type: 'public-key', id: decodeOrThrow(credentialId) }],
        userVerification: 'required',
        timeout: credentialTimeoutMs,
        extensions: { prf: { eval: { first: decodeOrThrow(prfInput) } } },
      },
    });
    if (!(assertion instanceof PublicKeyCredential))
      throw new BiometricUnlockError('unknown', 'No credential returned');
    if (encodeBase64Url(new Uint8Array(assertion.rawId)) !== credentialId)
      throw new BiometricUnlockError('credential-mismatch', 'Unexpected credential returned');

    const prfOutput = readPrfOutput(assertion);
    if (!prfOutput) throw new BiometricUnlockError('no-prf', 'Credential returned no PRF output');
    return prfOutput;
  });
}

interface PlatformCredentialEnrollment {
  credentialId: string;
  prfInput: string;
  registrationTag: string;
  prfOutput: Uint8Array;
}

export function createPlatformCredential(
  credentials: CredentialsApi = getCredentialsApi()
): Promise<PlatformCredentialEnrollment> {
  return withBiometricUnlockErrors(async () => {
    const prfInput = encodeBase64Url(generatePrfInput());
    const registrationTag = generateRegistrationTag();
    const userLabel = getPlatformUnlockUserLabel(registrationTag);

    const credential = await credentials.create({
      publicKey: {
        rp: { name: relyingPartyName },
        user: { id: randomBytes(userIdByteLength), name: userLabel, displayName: userLabel },
        challenge: randomBytes(challengeByteLength),
        pubKeyCredParams: [{ type: 'public-key', alg: es256Algorithm }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
          requireResidentKey: false,
        },
        attestation: 'none',
        timeout: credentialTimeoutMs,
        extensions: { prf: { eval: { first: decodeOrThrow(prfInput) } } },
      },
    });
    if (!(credential instanceof PublicKeyCredential))
      throw new BiometricUnlockError('unknown', 'No credential created');

    const credentialId = encodeBase64Url(new Uint8Array(credential.rawId));
    const prf = credential.getClientExtensionResults().prf;
    if (!prf?.enabled && !prf?.results?.first)
      throw new BiometricUnlockError('no-prf', 'Credential does not support PRF');

    const prfOutput =
      readPrfOutput(credential) ??
      (await getPlatformPrfOutput({ credentialId, prfInput }, credentials));

    return { credentialId, prfInput, registrationTag, prfOutput };
  });
}
