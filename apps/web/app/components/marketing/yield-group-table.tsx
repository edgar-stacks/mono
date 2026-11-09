import { Flex, VStack, styled } from 'leather-styles/jsx';
import { type YieldGroup } from '~/content/marketing-content';

interface YieldGroupTableProps {
  group: YieldGroup;
}

export function YieldGroupTable({ group }: YieldGroupTableProps) {
  return (
    <VStack alignItems="stretch" gap="space.05">
      <styled.div>
        <styled.h3 textStyle="heading.05">{group.title}</styled.h3>
        <styled.p mt="space.02" textStyle="body.01" color="ink.text-subdued" maxWidth="440px">
          {group.description}
        </styled.p>
      </styled.div>
      <styled.table width="100%" textStyle="body.01">
        <styled.thead>
          <styled.tr color="ink.text-subdued" textStyle="body.02">
            <styled.th textAlign="left" fontWeight="normal" pb="space.03">
              Providers
            </styled.th>
            <styled.th textAlign="right" fontWeight="normal" pb="space.03">
              Historical yield
            </styled.th>
          </styled.tr>
        </styled.thead>
        <styled.tbody>
          {group.providers.map(provider => (
            <styled.tr key={provider.name} borderTop="default">
              <styled.td py="space.04">
                <Flex alignItems="center" gap="space.03">
                  <styled.img
                    src={provider.icon}
                    alt=""
                    width="32px"
                    height="32px"
                    borderRadius="xs"
                    objectFit="cover"
                  />
                  <styled.span color="ink.text-subdued">{provider.name}</styled.span>
                </Flex>
              </styled.td>
              <styled.td py="space.04" textAlign="right" color="ink.text-subdued">
                {provider.yield}
              </styled.td>
            </styled.tr>
          ))}
        </styled.tbody>
      </styled.table>
    </VStack>
  );
}
