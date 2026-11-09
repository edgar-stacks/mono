import { Circle } from 'leather-styles/jsx';
import { ConnectActionRow, ConnectCard } from '~/components/connect-card/connect-card';
import { bitcoinStakingContent } from '~/content/bitcoin-staking-content';
import { openExternalLink } from '~/utils/external-links';

import { LEATHER_EXTENSION_CHROME_STORE_URL } from '@leather.io/constants';
import { Button, DownloadIcon, UserIcon } from '@leather.io/ui';

import { type StakingConnectAction } from '../hooks/use-staking-connect-action';

interface StakingConnectCardProps {
  connectAction: Extract<StakingConnectAction, { status: 'install' | 'connect' }>;
}

export function StakingConnectCard({ connectAction }: StakingConnectCardProps) {
  const content = bitcoinStakingContent.connectGate;

  return (
    <ConnectCard
      maxWidth="560px"
      mx="auto"
      title={content.updateTitle}
      description={content.updateDescription}
      data-testid="staking-connect-card"
    >
      {connectAction.status === 'install' ? (
        <ConnectActionRow
          img={
            <Circle border="default" size="48px">
              <DownloadIcon />
            </Circle>
          }
          title={content.installRowTitle}
          description={content.installRowDescription}
          trailing={
            <Button
              width="100px"
              height="48px"
              onClick={() => openExternalLink(LEATHER_EXTENSION_CHROME_STORE_URL)}
            >
              {content.installAction}
            </Button>
          }
        />
      ) : (
        <ConnectActionRow
          img={
            <Circle border="default" size="48px">
              <UserIcon />
            </Circle>
          }
          title={content.connectRowTitle}
          description={content.connectRowDescription}
          trailing={
            <Button width="100px" height="48px" onClick={() => void connectAction.run()}>
              {content.connectAction}
            </Button>
          }
        />
      )}
    </ConnectCard>
  );
}
