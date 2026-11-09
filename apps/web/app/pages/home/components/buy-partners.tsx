import { Flex, Grid, styled } from 'leather-styles/jsx';
import { buyPartners } from '~/content/marketing-content';

export function BuyPartners() {
  return (
    <Grid
      gridTemplateColumns={['1fr', null, '200px 1fr']}
      gap="space.05"
      alignItems="center"
      mt="space.04"
    >
      <styled.p textStyle="caption.01" color="ink.text-subdued" maxWidth="140px">
        Buy instantly through trusted partners.
      </styled.p>
      <Flex
        as="ul"
        justifyContent="space-between"
        alignItems="center"
        gap="space.05"
        flexWrap="wrap"
      >
        {buyPartners.map(partner => (
          <styled.li key={partner.name}>
            <styled.img
              src={partner.logo}
              alt={partner.name}
              height="24px"
              width="auto"
              opacity={0.7}
              loading="lazy"
            />
          </styled.li>
        ))}
      </Flex>
    </Grid>
  );
}
