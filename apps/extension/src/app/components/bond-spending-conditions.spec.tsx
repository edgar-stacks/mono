import { renderToString } from 'react-dom/server';

import {
  BondSpendingConditions,
  type BondSpendingConditionsDetails,
  formatVaultRequirement,
} from './bond-spending-conditions';

const multiVaultDetails: BondSpendingConditionsDetails = {
  unlockHeight: 1000,
  hash: 'ab'.repeat(32),
  counterpartyKey: 'counterparty-key-expression',
  vaultKind: 'multi',
  vaultThreshold: 2,
  vaultKeyExpressions: ['vault-key-a', 'vault-key-b', 'vault-key-c'],
};

const pkVaultDetails: BondSpendingConditionsDetails = {
  ...multiVaultDetails,
  vaultKind: 'pk',
  vaultThreshold: 1,
  vaultKeyExpressions: ['owner-key-expression'],
};

describe(formatVaultRequirement.name, () => {
  test('counts the vault co-signers of a multisig vault', () => {
    expect(formatVaultRequirement(multiVaultDetails)).toBe('2 of 3 vault co-signers');
  });

  test('names the owner key of a single-key vault', () => {
    expect(formatVaultRequirement(pkVaultDetails)).toBe('the owner key');
  });
});

describe(BondSpendingConditions.name, () => {
  test('renders both spending branches of a multisig vault', () => {
    const html = renderToString(<BondSpendingConditions details={multiVaultDetails} />);

    expect(html).toContain('From block <!-- -->1000');
    expect(html).toContain('Before block <!-- -->1000');
    expect(html).toContain('Requires <!-- -->2 of 3 vault co-signers');
    expect(html).toContain('counterparty-key-expression');
    expect(html).toContain(multiVaultDetails.hash);
    expect(html).not.toContain('Owner key');
  });

  test('renders the owner key of a single-key vault', () => {
    const html = renderToString(<BondSpendingConditions details={pkVaultDetails} />);

    expect(html).toContain('Requires <!-- -->the owner key');
    expect(html).toContain('Owner key');
    expect(html).toContain('owner-key-expression');
    expect(html).toContain('counterparty-key-expression');
  });
});
