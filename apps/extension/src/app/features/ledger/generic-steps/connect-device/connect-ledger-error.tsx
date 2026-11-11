import type { SupportedBlockchains } from '@leather.io/models';

import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import { ledgerAppNameForChain } from '@app/features/ledger/utils/bitcoin-ledger-utils';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';

import { ConnectLedgerErrorLayout } from './connect-ledger-error.layout';

interface ConnectLedgerErrorProps {
  chain: SupportedBlockchains;
  errorMessage?: string;
}
export function ConnectLedgerError({ chain, errorMessage }: ConnectLedgerErrorProps) {
  const ledgerSteps = useLedgerSteps();
  const network = useCurrentNetwork();

  const appName = ledgerAppNameForChain(chain, network.chain.bitcoin.mode);
  return (
    <ConnectLedgerErrorLayout
      warningText={errorMessage ?? null}
      appName={appName}
      onTryAgain={() => ledgerSteps.toConnectStepAndTryAgain()}
    />
  );
}
