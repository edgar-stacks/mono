import { Link } from 'react-router';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';

import { type YieldGroup, type YieldProduct, yieldProducts } from './yield-data';

const StyledLink = styled(Link);

interface YieldProvidersProps {
  group: YieldGroup;
}

export function YieldProviders({ group }: YieldProvidersProps) {
  return (
    <Box>
      <styled.h4 textStyle="label.01">{group.title}</styled.h4>
      <styled.p textStyle="body.02" color="ink.text-subdued" mt="space.02" maxWidth="440px">
        {group.description}
      </styled.p>
      <Flex
        justifyContent="space-between"
        textStyle="body.02"
        color="ink.text-subdued"
        mt="space.06"
        mb="space.03"
      >
        <span>Providers</span>
        <span>Historical yield</span>
      </Flex>
      <styled.ul>
        {group.providers.map(provider => (
          <styled.li
            key={provider.name}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap="space.04"
            py="space.03"
            borderBottom="default"
            _last={{ borderBottom: 'none' }}
          >
            <Flex alignItems="center" gap="space.03">
              <styled.img src={provider.icon} alt="" width="32px" height="32px" borderRadius="xs" />
              <styled.span textStyle="body.02">{provider.name}</styled.span>
            </Flex>
            <styled.span textStyle="body.02" textAlign="right">
              {provider.value}
            </styled.span>
          </styled.li>
        ))}
      </styled.ul>
    </Box>
  );
}

interface YieldCardProps {
  product: YieldProduct;
}

function YieldCard({ product }: YieldCardProps) {
  return (
    <styled.article border="default" borderRadius="sm" overflow="hidden">
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap={0}>
        <Flex flexDir="column" justifyContent="space-between" gap="space.07" p="space.05">
          <Flex alignItems="center" gap="space.03">
            <styled.img src={product.icon} alt="" width="40px" height="40px" />
            <styled.h3 textStyle="heading.04">{product.name}</styled.h3>
          </Flex>
          <StyledLink
            to={product.href}
            prefetch="intent"
            display="inline-flex"
            alignItems="center"
            gap="space.02"
            alignSelf="flex-start"
            bg="ink.text-primary"
            color="ink.background-primary"
            borderRadius="999px"
            px="space.04"
            py="space.02"
            textStyle="label.02"
          >
            {product.cta}
            <span aria-hidden>→</span>
          </StyledLink>
        </Flex>
        <Flex
          flexDir="column"
          justifyContent="space-between"
          gap="space.07"
          p="space.05"
          minHeight="200px"
          color="black"
          bgGradient="to-br"
          gradientFrom="#FFA93A"
          gradientTo="#FF5F2E"
        >
          <styled.p textStyle="display.02" fontSize={['3rem', null, '3.5rem']}>
            {product.headlineYield}
          </styled.p>
          <styled.p textStyle="caption.01" whiteSpace="pre-line">
            {'Based on avg. past\nyearly rewards'}
          </styled.p>
        </Flex>
      </Grid>
      <Flex
        flexDir="column"
        gap="space.08"
        p="space.05"
        pt="space.06"
        bg="ink.background-secondary"
      >
        {product.groups.map(group => (
          <YieldProviders key={group.title} group={group} />
        ))}
      </Flex>
    </styled.article>
  );
}

export function YieldCards() {
  return (
    <Flex flexDir="column" gap="space.05">
      {yieldProducts.map(product => (
        <YieldCard key={product.name} product={product} />
      ))}
    </Flex>
  );
}
