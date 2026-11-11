import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useLeatherConnect } from '~/store/addresses';

interface InstallStakingConnectAction {
  status: 'install';
  run(): void;
}

interface ConnectStakingConnectAction {
  status: 'connect';
  run(): Promise<void>;
}

export type StakingConnectAction =
  | { status: 'pending' }
  | { status: 'connected' }
  | InstallStakingConnectAction
  | ConnectStakingConnectAction;

export function useStakingConnectAction(): StakingConnectAction {
  const isHydrated = useIsHydrated();
  const { whenExtensionState, setShowInstallLeatherDialog, connect } = useLeatherConnect();

  if (!isHydrated) return { status: 'pending' };

  const installAction: InstallStakingConnectAction = {
    status: 'install',
    run() {
      setShowInstallLeatherDialog(true);
    },
  };

  const connectAction: ConnectStakingConnectAction = {
    status: 'connect',
    async run() {
      await connect();
    },
  };

  return whenExtensionState<StakingConnectAction>({
    connected: { status: 'connected' },
    detected: connectAction,
    missing: installAction,
  });
}
