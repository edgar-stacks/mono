import { useState } from 'react';
import { Link } from 'react-router';

import { Box, Flex, VStack, styled } from 'leather-styles/jsx';
import {
  CardGrid,
  FeaturedAppCard,
  MarketingImage,
  MarketingSection,
} from '~/features/marketing/marketing-components';
import { explorerFeaturedApps, explorerTabs } from '~/features/marketing/marketing-data';

export function ExplorerPage() {
  const [activeTabLabel, setActiveTabLabel] = useState(explorerTabs[0]?.label);
  const activeTab = explorerTabs.find(tab => tab.label === activeTabLabel) ?? explorerTabs[0];

  return (
    <Box maxWidth="1200px" mx="auto" px={['space.04', 'space.04', 'space.07']} py="space.06">
      <Link to="/sbtc" prefetch="intent">
        <Flex
          flexDir={['column', 'column', 'row']}
          justifyContent="space-between"
          alignItems={[null, null, 'center']}
          gap="space.04"
          p="space.06"
          borderRadius="md"
          bg="ink.background-secondary"
          _hover={{ bg: 'ink.component-background-hover' }}
        >
          <VStack alignItems="flex-start" gap="space.02">
            <styled.h1 textStyle="heading.02">Grow your Bitcoin</styled.h1>
            <styled.p textStyle="body.01" color="ink.text-subdued">
              Up to 8% with direct wallet payouts
            </styled.p>
          </VStack>
          <styled.span
            textStyle="label.02"
            bg="ink.action-primary-default"
            color="ink.background-primary"
            borderRadius="xs"
            px="space.05"
            py="space.03"
            alignSelf={['flex-start', 'flex-start', 'center']}
          >
            Get sBTC
          </styled.span>
        </Flex>
      </Link>

      <MarketingSection pb="space.05">
        <CardGrid columns={3}>
          {explorerFeaturedApps.map(app => (
            <FeaturedAppCard key={app.slug} app={app} />
          ))}
        </CardGrid>
      </MarketingSection>

      <MarketingSection
        title={
          <>
            more apps to
            <br />
            earn in stacks
          </>
        }
      >
        <Flex
          role="tablist"
          aria-label="App categories"
          gap="space.02"
          mb="space.05"
          flexWrap="wrap"
        >
          {explorerTabs.map(tab => {
            const isActive = tab.label === activeTab?.label;
            return (
              <styled.button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTabLabel(tab.label)}
                textStyle="label.02"
                borderRadius="round"
                border="default"
                px="space.04"
                py="space.02"
                bg={isActive ? 'ink.action-primary-default' : undefined}
                color={isActive ? 'ink.background-primary' : undefined}
              >
                {tab.label}
              </styled.button>
            );
          })}
        </Flex>
        <VStack as="ul" role="tabpanel" alignItems="stretch" gap="0">
          {activeTab?.apps.map(app => (
            <Flex
              as="li"
              key={app.slug}
              justifyContent="space-between"
              alignItems="center"
              py="space.04"
              borderBottom="default"
            >
              <Flex alignItems="center" gap="space.03">
                <MarketingImage
                  src={app.logo}
                  alt=""
                  width="36px"
                  height="36px"
                  borderRadius="sm"
                />
                <styled.span textStyle="label.01">{app.name}</styled.span>
              </Flex>
              {app.url && (
                <styled.a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  textStyle="label.02"
                  border="default"
                  borderRadius="round"
                  px="space.04"
                  py="space.02"
                  aria-label={`Open ${app.name}`}
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  Open
                </styled.a>
              )}
            </Flex>
          ))}
        </VStack>
        <styled.p textStyle="caption.01" color="ink.text-subdued" mt="space.07" maxWidth="720px">
          Leather does not operate or manage any Stacking pools or liquid Stacking protocols. Users
          are responsible for evaluating the risks, terms, and smart contracts involved in any
          third-party options they access through Leather.
        </styled.p>
      </MarketingSection>
    </Box>
  );
}
