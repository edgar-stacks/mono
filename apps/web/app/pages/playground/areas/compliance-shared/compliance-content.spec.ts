import {
  createDisputeDraft,
  getBackupWallets,
  mockMailContexts,
  mockWallets,
  toMailtoHref,
} from './compliance-content';

describe('getBackupWallets', () => {
  it('returns only wallets created in Leather', () => {
    expect(getBackupWallets(mockWallets.several).map(wallet => wallet.name)).toEqual([
      'Wallet 1',
      'Wallet 3',
    ]);
  });

  it('returns no wallets when every wallet was imported', () => {
    expect(getBackupWallets(mockWallets.imported)).toEqual([]);
  });
});

describe('toMailtoHref', () => {
  it('prefills the dispute draft with the filled-in block', () => {
    const href = toMailtoHref(createDisputeDraft(mockMailContexts.extension));
    expect(href).toContain(`subject=${encodeURIComponent('Dispute: Leather account restricted')}`);
    expect(decodeURIComponent(href)).toContain('Reference ID: CMP-7F3K-92QD');
  });
});
