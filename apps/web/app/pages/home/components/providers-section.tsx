import { Box, Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { LinkButton } from '~/components/marketing/link-button';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { YieldGroupTable } from '~/components/marketing/yield-group-table';
import { type YieldProduct, yieldProducts } from '~/content/marketing-content';

interface YieldProductCardProps {
  product: YieldProduct;
}

function YieldProductCard({ product }: YieldProductCardProps) {
  return (
    <Box border="default" borderRadius="md" overflow="hidden">
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap={0}>
        <Flex flexDir="column" justifyContent="space-between" gap="space.07" p="space.05">
          <Flex alignItems="center" gap="space.03">
            <styled.img
              src={product.icon}
              alt=""
              width="40px"
              height="40px"
              borderRadius="xs"
              objectFit="cover"
            />
            <styled.h3 textStyle="heading.04" fontWeight="normal">
              {product.name}
            </styled.h3>
          </Flex>
          <LinkButton to={product.href} size="sm" alignSelf="flex-start">
            {product.cta}
          </LinkButton>
        </Flex>
        <Flex
          flexDir="column"
          justifyContent="space-between"
          gap="space.07"
          p="space.05"
          bgGradient="to-br"
          gradientFrom="orange.action-primary-default"
          gradientTo="yellow.action-primary-default"
        >
          <styled.span fontSize="3.5rem" lineHeight="1" textStyle="heading.01">
            {product.headlineYield}
          </styled.span>
          <styled.span textStyle="caption.01" maxWidth="120px">
            Based on avg. past yearly rewards
          </styled.span>
        </Flex>
      </Grid>
      <VStack alignItems="stretch" gap="space.08" p="space.05" bg="ink.background-secondary">
        {product.groups.map(group => (
          <YieldGroupTable key={group.title} group={group} />
        ))}
      </VStack>
    </Box>
  );
}

export function ProvidersSection() {
  return (
    <Grid as="section" gridTemplateColumns={['1fr', null, null, '1fr 2fr']} gap="space.07">
      <Box position={[null, null, null, 'sticky']} top="space.07" alignSelf="start">
        <MarketingHeading>
          The best providers,
          <br />
          in one place.
        </MarketingHeading>
        <styled.p mt="space.04" textStyle="body.01">
          We’ve aggregated the best for you, so your assets work harder with full transparency and
          steady yields over time.
        </styled.p>
      </Box>
      <VStack alignItems="stretch" gap="space.06">
        {yieldProducts.map(product => (
          <YieldProductCard key={product.name} product={product} />
        ))}
      </VStack>
    </Grid>
  );
}
