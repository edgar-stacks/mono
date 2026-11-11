import { decodeBase64Url, encodeBase64Url } from './platform-unlock';

const credentialTimeoutMs = 120_000;
const challengeByteLength = 32;
const userIdByteLength = 16;
const prfOutputByteLength = 32;
const es256Algorithm = -7;
const relyingPartyName = 'Leather';
const userLabelTagLength = 6;

export type PlatformUnlockFailureCategory =
  | 'canceled'
  | 'unavailable'
  | 'no-prf'
  | 'credential-mismatch'
  | 'invalid-config'
  | 'wallet-validation'
  | 'unknown';

export class PlatformUnlockError extends Error {
  readonly category: PlatformUnlockFailureCategory;

  constructor(category: PlatformUnlockFailureCategory, message?: string) {
    super(message ?? `Platform unlock failed: ${category}`);
    this.name = 'PlatformUnlockError';
    this.category = category;
  }
}

export function getPlatformUnlockFailureCategory(error: unknown): PlatformUnlockFailureCategory {
  if (error instanceof PlatformUnlockError) return error.category;
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') return 'canceled';
    if (error.name === 'NotSupportedError' || error.name === 'SecurityError') return 'unavailable';
  }
  return 'unknown';
}

export function isPlatformAuthenticatorSupported() {
  return (
    typeof PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'credentials' in navigator &&
    !!navigator.credentials
  );
}

export async function isPlatformUnlockAvailable() {
  if (!isPlatformAuthenticatorSupported()) return false;
  try {
    if ('getClientCapabilities' in PublicKeyCredential) {
      const capabilities = await PublicKeyCredential.getClientCapabilities();
      if (capabilities['extension:prf'] === false) return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randomBytes(byteLength: number) {
  return crypto.getRandomValues(new Uint8Array(byteLength));
}

function bufferSourceToBytes(source: BufferSource) {
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

function readPrfOutput(credential: PublicKeyCredential) {
  const first = credential.getClientExtensionResults().prf?.results?.first;
  if (!first) return null;
  const prfOutput = new Uint8Array(bufferSourceToBytes(first));
  if (prfOutput.byteLength !== prfOutputByteLength) throw new PlatformUnlockError('no-prf');
  return prfOutput;
}

function decodeOrThrow(value: string) {
  const bytes = decodeBase64Url(value);
  if (!bytes) throw new PlatformUnlockError('invalid-config');
  return bytes;
}

export function getPlatformUnlockUserLabel(registrationTag: string) {
  return `Leather biometric unlock · ${registrationTag.slice(0, userLabelTagLength)}`;
}

interface CreatePlatformCredentialArgs {
  prfInput: string;
  registrationTag: string;
}
export async function createPlatformCredential({
  prfInput,
  registrationTag,
}: CreatePlatformCredentialArgs) {
  if (!isPlatformAuthenticatorSupported()) throw new PlatformUnlockError('unavailable');
  const label = getPlatformUnlockUserLabel(registrationTag);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(challengeByteLength),
      rp: { name: relyingPartyName },
      user: { id: randomBytes(userIdByteLength), name: label, displayName: label },
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

  if (!(credential instanceof PublicKeyCredential)) throw new PlatformUnlockError('unknown');

  const prfExtension = credential.getClientExtensionResults().prf;
  if (!prfExtension?.enabled) throw new PlatformUnlockError('no-prf');

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
  if (!isPlatformAuthenticatorSupported()) throw new PlatformUnlockError('unavailable');

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(challengeByteLength),
      allowCredentials: [{ type: 'public-key', id: decodeOrThrow(credentialId) }],
      userVerification: 'required',
      timeout: credentialTimeoutMs,
      extensions: { prf: { eval: { first: decodeOrThrow(prfInput) } } },
    },
  });

  if (!(assertion instanceof PublicKeyCredential)) throw new PlatformUnlockError('unknown');

  if (encodeBase64Url(new Uint8Array(assertion.rawId)) !== credentialId)
    throw new PlatformUnlockError('credential-mismatch');

  const prfOutput = readPrfOutput(assertion);
  if (!prfOutput) throw new PlatformUnlockError('no-prf');
  return prfOutput;
}
