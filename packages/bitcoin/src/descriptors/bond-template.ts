import { bytesToHex } from '@noble/hashes/utils';
import { type HDKey } from '@scure/bip32';

import { isDefined } from '@leather.io/utils';

import { minTimestampLockTime } from './bond-lock-script';
import {
  type AccountDescriptorKey,
  type CompiledWshDescriptor,
  compactDescriptor,
  compileWshDescriptor,
  findAccountDescriptorKey,
  getWshDescriptorThreshold,
  isExtendedPublicKeyExpression,
  isValidMultisigThreshold,
  maxMultisigKeys,
  parseMultisigLeaf,
} from './wsh-descriptor';

export const bondTemplateV1 = {
  id: 'bond-exit',
  version: 1,
  script:
    'wsh(and_v(v:or_i(after(<<param:unlock_height>>),and_v(v:sha256(<<param:hash>>),pk(<<param:counterparty_key>>))),<<vault:multi>>))',
} as const;

const bondDescriptorPattern =
  /^wsh\(and_v\(v:or_i\(after\((\d{1,10})\),and_v\(v:sha256\(([0-9a-fA-F]{64})\),pk\(([^()]+)\)\)\),((?:sorted)?multi\([^()]+\)|pk\([^()]+\))\)\)$/;

const pkLeafPattern = /^pk\(([^()]+)\)$/;
const compressedPubkeyHexPattern = /^0[23][0-9a-f]{64}$/;
const compressedPubkeyAnyCaseHexPattern = /^0[23][0-9a-fA-F]{64}$/;
const bondExtendedKeyPattern =
  /^(?:\[[0-9a-fA-F]{8}(?:\/\d{1,10}['h]?){0,8}\])?[1-9A-HJ-NP-Za-km-z]+\/0\/(\d{1,10})$/;
const maxNonHardenedIndex = 0x7fffffff;

function isBondExtendedKeyExpression(keyExpression: string): boolean {
  const addressIndex = bondExtendedKeyPattern.exec(keyExpression)?.[1];
  if (!addressIndex || Number(addressIndex) > maxNonHardenedIndex) return false;
  return isExtendedPublicKeyExpression(keyExpression);
}

function isBondKeyExpression(keyExpression: string): boolean {
  return (
    compressedPubkeyHexPattern.test(keyExpression) || isBondExtendedKeyExpression(keyExpression)
  );
}

function normalizeBondKey(keyExpression: string): string {
  return compressedPubkeyAnyCaseHexPattern.test(keyExpression)
    ? keyExpression.toLowerCase()
    : keyExpression;
}

export interface BondVaultLeaf {
  kind: 'pk' | 'multi';
  expression: string;
  requiredSignatures: number;
  keys: string[];
}

function parseBondVaultLeaf(expression: string): BondVaultLeaf | null {
  const pkKey = pkLeafPattern.exec(expression)?.[1];
  if (pkKey) {
    const key = normalizeBondKey(pkKey);
    if (!isBondKeyExpression(key)) return null;
    return { kind: 'pk', expression, requiredSignatures: 1, keys: [key] };
  }

  const multisig = parseMultisigLeaf(expression);
  if (!multisig) return null;
  const keys = multisig.keyExpressions.map(normalizeBondKey);
  if (!keys.every(isBondKeyExpression)) return null;
  return { kind: 'multi', expression, requiredSignatures: multisig.threshold, keys };
}

export interface BondDescriptorParams {
  unlockHeight: number;
  hash: string;
  counterpartyKey: string;
}

export interface BondTemplateMatch extends BondDescriptorParams {
  vault: BondVaultLeaf;
}

export function matchBondTemplateDescriptor(descriptor: string): BondTemplateMatch | null {
  const match = bondDescriptorPattern.exec(compactDescriptor(descriptor));
  if (!match) return null;

  const rawUnlockHeight = match[1];
  const hash = match[2];
  const rawCounterpartyKey = match[3];
  const vaultExpression = match[4];
  if (!rawUnlockHeight || !hash || !rawCounterpartyKey || !vaultExpression) return null;
  const counterpartyKey = normalizeBondKey(rawCounterpartyKey);
  if (!isBondKeyExpression(counterpartyKey)) return null;

  const vault = parseBondVaultLeaf(vaultExpression);
  if (!vault) return null;

  const unlockHeight = Number(rawUnlockHeight);
  if (!isValidUnlockHeight(unlockHeight)) return null;

  return {
    unlockHeight,
    hash: hash.toLowerCase(),
    counterpartyKey,
    vault,
  };
}

export interface BondDescriptorMatch extends BondDescriptorParams {
  multiExpression: string;
}

export function matchBondDescriptor(descriptor: string): BondDescriptorMatch | null {
  const match = matchBondTemplateDescriptor(descriptor);
  if (!match || match.vault.kind !== 'multi') return null;
  if (!match.vault.keys.every(isExtendedPublicKeyExpression)) return null;

  const { vault, ...params } = match;
  return { ...params, multiExpression: vault.expression };
}

export function findPolicyMemberAccountKey(
  descriptor: string,
  compiled: CompiledWshDescriptor,
  accountKeychain: HDKey
): AccountDescriptorKey | undefined {
  const bond = matchBondTemplateDescriptor(descriptor);
  if (!bond) return findAccountDescriptorKey(compiled, accountKeychain);

  const vaultPubkeys = compileWshDescriptor(`wsh(${bond.vault.expression})`)
    .keys.map(key => key.pubkey)
    .filter(isDefined)
    .map(pubkey => bytesToHex(pubkey));
  const vaultKeys = compiled.keys.filter(
    key => !!key.pubkey && vaultPubkeys.includes(bytesToHex(key.pubkey))
  );
  return findAccountDescriptorKey({ ...compiled, keys: vaultKeys }, accountKeychain);
}

function isValidUnlockHeight(unlockHeight: number): boolean {
  return Number.isInteger(unlockHeight) && unlockHeight >= 1 && unlockHeight < minTimestampLockTime;
}

function assertValidBondLockParams({
  unlockHeight,
  hash,
}: Omit<BondDescriptorParams, 'counterpartyKey'>): void {
  if (!isValidUnlockHeight(unlockHeight))
    throw new Error('Bond unlock height must be a block height below 500000000');
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Bond hash must be a 32-byte hex digest');
}

function assertValidVaultKeys({ threshold, keyExpressions }: BondVaultKeys): void {
  if (!keyExpressions.length)
    throw new Error('Bond descriptor requires at least one vault key expression');
  if (keyExpressions.length > maxMultisigKeys)
    throw new Error(`Bond vault supports at most ${maxMultisigKeys} keys`);
  if (!keyExpressions.every(isBondExtendedKeyExpression))
    throw new Error('Bond vault keys must be xpub or tpub key expressions on a /0/N path');
  if (!isValidMultisigThreshold(threshold, keyExpressions.length))
    throw new Error('Bond vault threshold is out of range');
}

function assertMatchesBondTemplate(descriptor: string): string {
  if (!matchBondDescriptor(descriptor))
    throw new Error('Bond descriptor does not match the bond template');
  return descriptor;
}

interface FillBondTemplateArgs {
  unlockHeight: number;
  hash: string;
  counterpartyKeyExpression: string;
  threshold: number;
  keyExpressions: string[];
}

function fillBondTemplate({
  unlockHeight,
  hash,
  counterpartyKeyExpression,
  threshold,
  keyExpressions,
}: FillBondTemplateArgs): string {
  const multiExpression = `sortedmulti(${threshold},${keyExpressions.join(',')})`;
  return bondTemplateV1.script
    .replace('<<param:unlock_height>>', String(unlockHeight))
    .replace('<<param:hash>>', hash)
    .replace('<<param:counterparty_key>>', counterpartyKeyExpression)
    .replace('<<vault:multi>>', multiExpression);
}

export interface InstantiateBondDescriptorArgs extends BondDescriptorParams {
  threshold: number;
  keyExpressions: string[];
}

export function instantiateBondDescriptor({
  unlockHeight,
  hash,
  counterpartyKey,
  threshold,
  keyExpressions,
}: InstantiateBondDescriptorArgs): string {
  assertValidBondLockParams({ unlockHeight, hash });
  if (!isBondKeyExpression(counterpartyKey))
    throw new Error(
      'Bond counterparty key must be an xpub or tpub key expression on a /0/N path or a compressed public key'
    );
  assertValidVaultKeys({ threshold, keyExpressions });

  return assertMatchesBondTemplate(
    fillBondTemplate({
      unlockHeight,
      hash,
      counterpartyKeyExpression: counterpartyKey,
      threshold,
      keyExpressions,
    })
  );
}

export interface ReconstructBondDescriptorArgs {
  unlockHeight: number;
  hash: string;
  covenantPubkey: string;
  threshold: number;
  keyExpressions: string[];
}

export function reconstructBondDescriptor({
  unlockHeight,
  hash,
  covenantPubkey,
  threshold,
  keyExpressions,
}: ReconstructBondDescriptorArgs): string {
  assertValidBondLockParams({ unlockHeight, hash });
  if (!compressedPubkeyHexPattern.test(covenantPubkey))
    throw new Error('Bond covenant key must be a compressed public key in lowercase hex');
  assertValidVaultKeys({ threshold, keyExpressions });

  return assertMatchesBondTemplate(
    fillBondTemplate({
      unlockHeight,
      hash,
      counterpartyKeyExpression: covenantPubkey,
      threshold,
      keyExpressions,
    })
  );
}

export interface BondVaultKeys {
  threshold: number;
  keyExpressions: string[];
}

export function getBondVaultKeys(policyDescriptor: string): BondVaultKeys {
  const { keys } = compileWshDescriptor(policyDescriptor);
  return {
    threshold: getWshDescriptorThreshold(policyDescriptor),
    keyExpressions: keys.map(key => key.keyExpression),
  };
}
