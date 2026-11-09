import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useLeatherConnect } from '~/store/addresses';

interface InstallAction {
  status: 'install';
  run(): void;
}

interface ConnectAction {
  status: 'connect';
  run(): Promise<void>;
}

export type StakingConnectAction =
  | { status: 'pending' }
  | { status: 'connected' }
  | InstallAction
  | ConnectAction;

export function useStakingConnectAction(): StakingConnectAction {
  const isHydrated = useIsHydrated();
  const { whenExtensionState, setShowInstallLeatherDialog, connect } = useLeatherConnect();

  if (!isHydrated) return { status: 'pending' };

  const installAction: InstallAction = {
    status: 'install',
    run() {
      setShowInstallLeatherDialog(true);
    },
  };
  const connectAction: ConnectAction = {
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
