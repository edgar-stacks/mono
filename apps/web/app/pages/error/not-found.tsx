import { Flex, VStack, styled } from 'leather-styles/jsx';
import { HelpCards } from '~/features/marketing/help-cards';
import { Page } from '~/layouts/page/page';

export function NotFound() {
  return (
    <Page>
      <Flex alignItems="center" justifyContent="center" flexDir="column" py="space.09">
        <VStack gap="space.05" alignItems="center" maxWidth="640px" textAlign="center">
          <styled.img
            src="/marketing/error/wrong-turn.png"
            alt=""
            width="200px"
            height="190px"
            objectFit="contain"
          />
          <styled.h1 textStyle="heading.04" whiteSpace="pre-line">
            {'Oops! Seems like\nyou took a wrong turn'}
          </styled.h1>
        </VStack>
      </Flex>
      <HelpCards />
    </Page>
  );
}
