import { renderToString } from 'react-dom/server';

import {
  BondSpendingConditions,
  type BondSpendingConditionsProps,
  formatVaultRequirement,
} from './bond-spending-conditions';

const multiVault: BondSpendingConditionsProps = {
  unlockHeight: 900_000,
  hash: 'ab'.repeat(32),
  counterpartyKey: 'counterparty-key-expression',
  vaultKind: 'multi',
  vaultThreshold: 2,
  vaultKeyExpressions: ['vault-key-a', 'vault-key-b', 'vault-key-c'],
};

const pkVault: BondSpendingConditionsProps = {
  ...multiVault,
  vaultKind: 'pk',
  vaultThreshold: 1,
  vaultKeyExpressions: ['owner-key-expression'],
};

describe(formatVaultRequirement.name, () => {
  test('describes a multi vault by its co-signer threshold', () => {
    expect(formatVaultRequirement(multiVault)).toBe('Requires 2 of 3 vault co-signers');
  });

  test('describes a pk vault as the owner key', () => {
    expect(formatVaultRequirement(pkVault)).toBe('Requires the owner key');
  });
});

describe(BondSpendingConditions.name, () => {
  test('renders both branches of a multi vault bond', () => {
    const html = renderToString(<BondSpendingConditions {...multiVault} />);

    expect(html).toContain('From block 900000');
    expect(html).toContain('Before block 900000');
    expect(html).toContain('Requires 2 of 3 vault co-signers');
    expect(html).toContain(
      'Requires 2 of 3 vault co-signers, plus a signature from the counterparty key and the secret matching the SHA-256 hash'
    );
    expect(html).toContain('counterparty-key-expression');
    expect(html).toContain(multiVault.hash);
    expect(html).not.toContain('Owner key');
  });

  test('shows the owner key for a pk vault', () => {
    const html = renderToString(<BondSpendingConditions {...pkVault} />);

    expect(html).toContain('Requires the owner key');
    expect(html).toContain('Owner key');
    expect(html).toContain('owner-key-expression');
    expect(html).toContain('counterparty-key-expression');
  });
});
