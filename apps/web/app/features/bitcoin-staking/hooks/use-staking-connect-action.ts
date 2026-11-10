import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useLeatherConnect } from '~/store/addresses';

interface StakingInstallAction {
  status: 'install';
  run(): void;
}

interface StakingWalletConnectAction {
  status: 'connect';
  run(): Promise<void>;
}

export type StakingConnectAction =
  | { status: 'pending' }
  | { status: 'connected' }
  | StakingInstallAction
  | StakingWalletConnectAction;

export function useStakingConnectAction(): StakingConnectAction {
  const isHydrated = useIsHydrated();
  const { whenExtensionState, setShowInstallLeatherDialog, connect } = useLeatherConnect();

  if (!isHydrated) return { status: 'pending' };

  const installAction: StakingInstallAction = {
    status: 'install',
    run() {
      setShowInstallLeatherDialog(true);
    },
  };
  const walletConnectAction: StakingWalletConnectAction = {
    status: 'connect',
    async run() {
      await connect();
    },
  };

  return whenExtensionState<StakingConnectAction>({
    connected: { status: 'connected' },
    detected: walletConnectAction,
    missing: installAction,
  });
}
