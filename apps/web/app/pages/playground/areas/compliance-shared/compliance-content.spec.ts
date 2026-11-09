import { complianceWalletSets, createComplianceMail, getBackupWallets } from './compliance-content';

describe(getBackupWallets.name, () => {
  it('returns only wallets created in Leather', () => {
    expect(getBackupWallets(complianceWalletSets.several).map(wallet => wallet.name)).toEqual([
      'Wallet 1',
      'Wallet 3',
    ]);
  });

  it('returns no wallets when every wallet was imported', () => {
    expect(getBackupWallets(complianceWalletSets.imported)).toEqual([]);
  });
});

describe(createComplianceMail.name, () => {
  it('prefills the dispute draft with app version, platform, time and reference ID', () => {
    const mail = createComplianceMail('dispute', {
      platform: 'mobile',
      time: new Date('2026-11-09T14:32:00Z'),
      referenceId: 'LTH-TEST',
    });
    expect(mail.subject).toEqual('Dispute: Leather account restricted');
    expect(mail.body).toContain('— Filled in by Leather —');
    expect(mail.body).toContain('Platform: Mobile');
    expect(mail.body).toContain('Time: 2026-11-09T14:32:00.000Z');
    expect(mail.body).toContain('Reference ID: LTH-TEST');
    expect(mail.href.startsWith(`mailto:${mail.to}?subject=`)).toBe(true);
  });
});
