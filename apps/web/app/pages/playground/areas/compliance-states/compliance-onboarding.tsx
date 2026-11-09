import { Grid, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { mockSecretKey } from '../compliance-shared/compliance-content';
import { Screen } from '../compliance-shared/compliance-screen-parts';

interface RestoreScreenProps {
  restoring: boolean;
}

export function RestoreScreen({ restoring }: RestoreScreenProps) {
  return (
    <Screen
      title="Restore wallet"
      footer={
        <Button size="lg" width="100%" aria-busy={restoring}>
          Continue
        </Button>
      }
    >
      <Stack gap="space.04">
        <styled.h1 textStyle="heading.03">Enter your Secret Key</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Paste or type the 12 words of the wallet you want to restore.
        </styled.p>
        <Grid gridTemplateColumns="repeat(3, 1fr)" gap="space.02">
          {mockSecretKey.map((word, index) => (
            <styled.span
              key={word}
              textStyle="label.03"
              px="space.02"
              py="space.02"
              borderRadius="xs"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="ink.border-default"
            >
              {index + 1}. {word}
            </styled.span>
          ))}
        </Grid>
      </Stack>
    </Screen>
  );
}
