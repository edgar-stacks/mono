import { Grid, Stack, styled } from 'leather-styles/jsx';

import { complianceCopy, complianceCopyGroups } from '../compliance-shared/compliance-content';

const sampleWalletName = 'Wallet 1';

function renderCopyValue(value: string | ((walletName: string) => string)) {
  return typeof value === 'function' ? value(sampleWalletName) : value;
}

export function ComplianceCopyDeck() {
  return (
    <Grid gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap="space.05">
      {complianceCopyGroups.map(group => (
        <Stack
          key={group.id}
          gap="space.03"
          p="space.04"
          borderWidth={1}
          borderColor="ink.border-default"
          borderRadius="md"
        >
          <styled.h4 textStyle="label.01">{group.label}</styled.h4>
          {Object.entries(complianceCopy[group.id]).map(([key, value]) => (
            <Stack key={key} gap="0">
              <styled.code textStyle="caption.02" color="ink.text-subdued">
                {group.id}.{key}
              </styled.code>
              <styled.p textStyle="body.02" whiteSpace="pre-wrap">
                {renderCopyValue(value)}
              </styled.p>
            </Stack>
          ))}
        </Stack>
      ))}
    </Grid>
  );
}
