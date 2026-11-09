import { Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { helpLinks, marketingAsset } from '~/content/marketing-content';
import { Page } from '~/layouts/page/page';

export function NotFound() {
  return (
    <Page>
      <Flex
        alignItems="center"
        justifyContent="center"
        flexDir="column"
        minHeight="calc(100vh - 142px)"
        py="space.08"
      >
        <VStack gap="space.07" alignItems="center" width="100%" textAlign="center">
          <styled.img
            src={marketingAsset('images/not-found.png')}
            alt=""
            width="180px"
            height="176px"
            objectFit="contain"
          />
          <styled.h1 textStyle="heading.04" fontSize="2rem" lineHeight="2.5rem">
            Oops! Seems like
            <br />
            you took a wrong turn
          </styled.h1>
          <Grid
            as="ul"
            gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']}
            gap={0}
            width="100%"
            borderY="default"
          >
            {helpLinks.map(({ href, title, description, icon }) => (
              <styled.li
                key={href}
                borderRight={[null, null, 'default']}
                _last={{ borderRight: 'none' }}
              >
                <styled.a
                  href={href}
                  display="flex"
                  flexDir="column"
                  alignItems="flex-start"
                  gap="space.02"
                  height="100%"
                  p="space.06"
                  textAlign="left"
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  <Flex
                    width="48px"
                    height="48px"
                    alignItems="center"
                    justifyContent="center"
                    bg="ink.background-secondary"
                    mb="space.07"
                  >
                    <styled.img src={icon} alt="" width="24px" height="24px" />
                  </Flex>
                  <styled.span textStyle="heading.05">{title}</styled.span>
                  <styled.span textStyle="caption.01" color="ink.text-subdued">
                    {description}
                  </styled.span>
                </styled.a>
              </styled.li>
            ))}
          </Grid>
        </VStack>
      </Flex>
    </Page>
  );
}
