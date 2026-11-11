import { Box, Grid, Stack, styled } from 'leather-styles/jsx';

import { complianceCopy } from '../compliance-shared/compliance-content';

const sampleWalletName = 'Wallet 1';

const screenLabels = {
  lockout: 'Lockout',
  why: 'Why Leather is locked',
  recipientRefused: 'Recipient refused',
  counterpartyRefused: 'Counterparty refused',
  multisigRefused: 'Multisig refused',
  actions: 'Actions',
  noAnswer: 'No answer',
  keyBackup: 'Key backup',
  email: 'Email drafts',
} satisfies Record<keyof typeof complianceCopy, string>;

const labelByScreen = new Map<string, string>(Object.entries(screenLabels));

function renderCopy(value: string | ((walletName: string) => string)) {
  return typeof value === 'function' ? value(sampleWalletName) : value;
}

export function ComplianceCopyDeck() {
  return (
    <Stack gap="space.06">
      {Object.entries(complianceCopy).map(([screen, strings]) => (
        <Stack key={screen} gap="space.02">
          <styled.h3 textStyle="label.01">{labelByScreen.get(screen) ?? screen}</styled.h3>
          <Box borderWidth={1} borderColor="ink.border-default" borderRadius="sm">
            {Object.entries(strings).map(([key, value]) => (
              <Grid
                key={key}
                gridTemplateColumns="200px minmax(0, 1fr)"
                gap="space.04"
                px="space.04"
                py="space.03"
                borderTopWidth={1}
                borderColor="ink.border-transparent"
              >
                <styled.code textStyle="caption.02" color="ink.text-subdued">
                  {`${screen}.${key}`}
                </styled.code>
                <styled.span textStyle="body.02" color="ink.text-primary" whiteSpace="pre-wrap">
                  {renderCopy(value)}
                </styled.span>
              </Grid>
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
