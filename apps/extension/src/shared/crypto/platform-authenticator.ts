import {
  decodeCanonicalBase64Url,
  encodeBase64Url,
  getRegistrationLabelTag,
} from './platform-unlock';

export type BiometricUnlockFailureCategory =
  | 'canceled'
  | 'unsupported'
  | 'no-prf'
  | 'credential-mismatch'
  | 'invalid-config'
  | 'stale-state'
  | 'wallet-validation'
  | 'unknown';

export class BiometricUnlockError extends Error {
  readonly category: BiometricUnlockFailureCategory;

  constructor(category: BiometricUnlockFailureCategory, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BiometricUnlockError';
    this.category = category;
  }
}

export function getBiometricUnlockFailureCategory(error: unknown): BiometricUnlockFailureCategory {
  if (error instanceof BiometricUnlockError) return error.category;
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'canceled';
  if (error instanceof DOMException && error.name === 'AbortError') return 'canceled';
  return 'unknown';
}

const relyingPartyName = 'Leather';
const userLabelPrefix = 'Leather biometric unlock';
const credentialTimeoutMs = 120_000;
const es256Algorithm = -7;
const challengeByteLength = 32;
const userIdByteLength = 16;
const prfOutputByteLength = 32;

function randomBytes(byteLength: number) {
  return crypto.getRandomValues(new Uint8Array(byteLength));
}

function decodeOrThrow(value: string) {
  const bytes = decodeCanonicalBase64Url(value);
  if (!bytes) throw new BiometricUnlockError('invalid-config', 'Invalid platform unlock encoding');
  return new Uint8Array(bytes);
}

function bufferSourceToBytes(source: BufferSource | undefined) {
  if (!source) return undefined;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength).slice();
}

function readPrfOutput(credential: PublicKeyCredential) {
  const output = bufferSourceToBytes(credential.getClientExtensionResults().prf?.results?.first);
  if (output && output.length !== prfOutputByteLength) {
    throw new BiometricUnlockError('no-prf', 'Unexpected PRF output length');
  }
  return output;
}

export function isWebAuthnApiPresent() {
  if (typeof PublicKeyCredential === 'undefined') return false;
  if (typeof navigator === 'undefined' || !('credentials' in navigator)) return false;
  return !navigator.userAgent.includes('Firefox');
}

export async function isPlatformUnlockAvailable() {
  if (!isWebAuthnApiPresent()) return false;
  try {
    const hasPlatformAuthenticator =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!hasPlatformAuthenticator) return false;
    if ('getClientCapabilities' in PublicKeyCredential) {
      const capabilities = await PublicKeyCredential.getClientCapabilities();
      if (capabilities['extension:prf'] === false) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getPlatformCredentialUserLabel(registrationTag: string) {
  return `${userLabelPrefix} · ${getRegistrationLabelTag(registrationTag)}`;
}

interface CreatePlatformCredentialArgs {
  prfInput: string;
  registrationTag: string;
}
export async function createPlatformCredential({
  prfInput,
  registrationTag,
}: CreatePlatformCredentialArgs) {
  if (!isWebAuthnApiPresent()) {
    throw new BiometricUnlockError('unsupported', 'WebAuthn is not available');
  }
  const userLabel = getPlatformCredentialUserLabel(registrationTag);
  const credential = await navigator.credentials.create({
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
  if (!(credential instanceof PublicKeyCredential)) {
    throw new BiometricUnlockError('unknown', 'No credential was created');
  }
  if (credential.getClientExtensionResults().prf?.enabled !== true) {
    throw new BiometricUnlockError('no-prf', 'The credential does not support PRF');
  }
  return {
    credentialId: encodeBase64Url(new Uint8Array(credential.rawId)),
    prfOutput: readPrfOutput(credential),
  };
}

interface GetPlatformPrfOutputArgs {
  credentialId: string;
  prfInput: string;
}
export async function getPlatformPrfOutput({ credentialId, prfInput }: GetPlatformPrfOutputArgs) {
  if (!isWebAuthnApiPresent()) {
    throw new BiometricUnlockError('unsupported', 'WebAuthn is not available');
  }
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(challengeByteLength),
      allowCredentials: [{ type: 'public-key', id: decodeOrThrow(credentialId) }],
      userVerification: 'required',
      timeout: credentialTimeoutMs,
      extensions: { prf: { eval: { first: decodeOrThrow(prfInput) } } },
    },
  });
  if (!(assertion instanceof PublicKeyCredential)) {
    throw new BiometricUnlockError('unknown', 'No assertion was returned');
  }
  if (encodeBase64Url(new Uint8Array(assertion.rawId)) !== credentialId) {
    throw new BiometricUnlockError('credential-mismatch', 'An unexpected credential was used');
  }
  const prfOutput = readPrfOutput(assertion);
  if (!prfOutput) throw new BiometricUnlockError('no-prf', 'The authenticator returned no PRF');
  return prfOutput;
}
