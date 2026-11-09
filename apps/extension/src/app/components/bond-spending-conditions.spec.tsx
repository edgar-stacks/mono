import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import {
  BondSpendingConditions,
  type BondVaultRequirement,
  formatVaultRequirement,
  formatVaultSigners,
} from './bond-spending-conditions';

vi.mock('leather-styles/jsx', () => ({
  Stack({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
  styled: {
    span({ children }: { children: React.ReactNode }) {
      return <span>{children}</span>;
    },
    code({ children }: { children: React.ReactNode }) {
      return <code>{children}</code>;
    },
  },
}));

const hash = 'a'.repeat(64);
const counterpartyKey = `02${'b'.repeat(64)}`;
const ownerKey = `03${'c'.repeat(64)}`;
const multiVault: BondVaultRequirement = {
  vaultKind: 'multi',
  vaultThreshold: 2,
  vaultKeyExpressions: ['xpubA/0/0', 'xpubB/0/0', 'xpubC/0/0'],
};
const pkVault: BondVaultRequirement = {
  vaultKind: 'pk',
  vaultThreshold: 1,
  vaultKeyExpressions: [ownerKey],
};

describe(formatVaultRequirement.name, () => {
  test('describes a multi vault as a count of co-signers', () => {
    expect(formatVaultSigners(multiVault)).toBe('2 of 3 vault co-signers');
    expect(formatVaultRequirement(multiVault)).toBe('Requires 2 of 3 vault co-signers');
  });

  test('describes a pk vault as the owner key', () => {
    expect(formatVaultSigners(pkVault)).toBe('the owner key');
    expect(formatVaultRequirement(pkVault)).toBe('Requires the owner key');
  });
});

describe(BondSpendingConditions.name, () => {
  test('shows both branches for a multi vault', () => {
    render(
      <BondSpendingConditions
        unlockHeight={900000}
        hash={hash}
        counterpartyKey={counterpartyKey}
        {...multiVault}
      />
    );

    expect(screen.getByText('From block 900000')).toBeDefined();
    expect(screen.getByText('Requires 2 of 3 vault co-signers')).toBeDefined();
    expect(screen.getByText('Before block 900000')).toBeDefined();
    expect(
      screen.getByText(
        'Requires 2 of 3 vault co-signers, plus a signature from the counterparty key and the secret matching the SHA-256 hash'
      )
    ).toBeDefined();
    expect(screen.getByText(counterpartyKey)).toBeDefined();
    expect(screen.getByText(hash)).toBeDefined();
    expect(screen.queryByText('Owner key')).toBeNull();
  });

  test('shows the owner key for a pk vault', () => {
    render(
      <BondSpendingConditions
        unlockHeight={900000}
        hash={hash}
        counterpartyKey={counterpartyKey}
        {...pkVault}
      />
    );

    expect(screen.getByText('Requires the owner key')).toBeDefined();
    expect(screen.getByText('Owner key')).toBeDefined();
    expect(screen.getByText(ownerKey)).toBeDefined();
  });
});
