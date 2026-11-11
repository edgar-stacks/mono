import { Circle } from 'leather-styles/jsx';
import { ConnectActionRow, ConnectCard } from '~/components/connect-card/connect-card';
import { bitcoinStakingContent } from '~/content/bitcoin-staking-content';
import { openExternalLink } from '~/utils/external-links';

import { LEATHER_EXTENSION_CHROME_STORE_URL } from '@leather.io/constants';
import { Button, DownloadIcon, UserIcon } from '@leather.io/ui';

import { useStakingConnectAction } from '../hooks/use-staking-connect-action';

export function StakingConnectCard() {
  const connectAction = useStakingConnectAction();
  const content = bitcoinStakingContent.connectGate;

  return (
    <ConnectCard
      position="relative"
      maxWidth="500px"
      title={content.updateTitle}
      description={content.updateDescription}
    >
      {connectAction.status === 'install' && (
        <ConnectActionRow
          hideBodyBelowSm
          img={
            <Circle border="default" size="48px">
              <DownloadIcon />
            </Circle>
          }
          title={content.installAction}
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
      )}
      {connectAction.status === 'connect' && (
        <ConnectActionRow
          hideBodyBelowSm
          img={
            <Circle border="default" size="48px">
              <UserIcon />
            </Circle>
          }
          title={content.connectAction}
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
