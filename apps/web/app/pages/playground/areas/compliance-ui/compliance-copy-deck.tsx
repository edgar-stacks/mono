import { Grid, Stack, styled } from 'leather-styles/jsx';

import { complianceCopy, copyDeckGroups } from '../compliance-shared/compliance-content';

export function ComplianceCopyDeck() {
  return (
    <Grid gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap="space.05">
      {copyDeckGroups.map(group => (
        <Stack
          key={group.id}
          gap="space.03"
          p="space.05"
          borderRadius="md"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
        >
          <styled.h3 textStyle="label.01">{group.label}</styled.h3>
          {Object.entries(complianceCopy[group.id]).map(([key, text]) => (
            <Stack key={key} gap="space.01">
              <styled.code textStyle="caption.02" color="ink.text-subdued">
                {group.id}.{key}
              </styled.code>
              <styled.span textStyle="body.02">{text}</styled.span>
            </Stack>
          ))}
        </Stack>
      ))}
    </Grid>
  );
}
