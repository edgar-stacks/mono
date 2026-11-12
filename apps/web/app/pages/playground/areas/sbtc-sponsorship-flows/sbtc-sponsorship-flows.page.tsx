import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Badge } from '@leather.io/ui';

import { ContractCallBundleFlow } from './contract-call-bundle-flow';
import { SponsoredSendFlow } from './sponsored-send-flow';

interface FlowSectionProps {
  title: string;
  description: string;
  badge: ReactNode;
  children: ReactNode;
}

function FlowSection({ title, description, badge, children }: FlowSectionProps) {
  return (
    <Stack gap="space.04">
      <Stack gap="space.02" maxWidth="640px">
        <Flex alignItems="center" gap="space.03">
          <styled.h2 textStyle="heading.04">{title}</styled.h2>
          {badge}
        </Flex>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {description}
        </styled.p>
      </Stack>
      {children}
    </Stack>
  );
}

export function SbtcSponsorshipFlowsPage() {
  return (
    <Stack gap="space.09" p="space.07" pb="space.10">
      <Stack gap="space.02" maxWidth="640px">
        <styled.h1 textStyle="heading.03">sBTC sponsorship flows</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Click-through mocks of paying Stacks network fees in sBTC through a Leather sponsor. Local
          state and sample data only. No transaction is sent.
        </styled.p>
      </Stack>
      <FlowSection
        title="Pay the fee in sBTC"
        description="Sending sBTC with a sponsored fee: pick a Low, Standard or High sBTC fee, review, confirm and see the summary. Custom fees are not offered."
        badge={<Badge variant="success" label="Shipping" size="sm" />}
      >
        <SponsoredSendFlow />
      </FlowSection>
      <FlowSection
        title="Planned: two-transaction bundle for arbitrary contract calls"
        description="Exploration. Any contract call could be sponsored by preceding it with an sBTC fee transfer to the sponsor, then signing both transactions together."
        badge={<Badge variant="warning" label="Exploration" size="sm" />}
      >
        <ContractCallBundleFlow />
      </FlowSection>
    </Stack>
  );
}
