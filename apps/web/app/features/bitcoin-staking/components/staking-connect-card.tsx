import { Circle, Flex } from 'leather-styles/jsx';
import { ConnectActionRow, ConnectCard } from '~/components/connect-card/connect-card';
import { bitcoinStakingContent } from '~/content/bitcoin-staking-content';
import { useLeatherConnect } from '~/store/addresses';
import { openExternalLink } from '~/utils/external-links';

import { LEATHER_EXTENSION_CHROME_STORE_URL } from '@leather.io/constants';
import { Button, DownloadIcon, LoadingSpinner, UserIcon } from '@leather.io/ui';

import { useStakingConnectAction } from '../hooks/use-staking-connect-action';

export function StakingConnectCard() {
  const connectAction = useStakingConnectAction();
  const { connect } = useLeatherConnect();
  const content = bitcoinStakingContent.connectGate;

  if (connectAction.status === 'pending') {
    return (
      <Flex justifyContent="center" alignItems="center" h="100%">
        <LoadingSpinner fill="ink.text-subdued" />
      </Flex>
    );
  }

  return (
    <ConnectCard
      maxWidth="500px"
      title={content.cardTitle}
      description={content.cardDescription}
      data-testid="staking-connect-card"
    >
      {connectAction.status === 'install' ? (
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
      ) : (
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
            <Button width="100px" height="48px" onClick={() => void connect()}>
              {content.connectAction}
            </Button>
          }
        />
      )}
    </ConnectCard>
  );
}
