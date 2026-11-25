import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useLeatherConnect } from '~/store/addresses';

interface StakingConnectRun {
  status: 'connect';
  run(): Promise<void>;
}

export type StakingConnectAction =
  | { status: 'pending' }
  | { status: 'connected' }
  | { status: 'install'; run(): void }
  | StakingConnectRun;

export function useStakingConnectAction(): StakingConnectAction {
  const isHydrated = useIsHydrated();
  const { whenExtensionState, setShowInstallLeatherDialog, connect } = useLeatherConnect();

  if (!isHydrated) return { status: 'pending' };

  const connectRun: StakingConnectRun = {
    status: 'connect',
    async run() {
      await connect();
    },
  };

  return whenExtensionState<StakingConnectAction>({
    connected: { status: 'connected' },
    detected: connectRun,
    missing: {
      status: 'install',
      run() {
        setShowInstallLeatherDialog(true);
      },
    },
  });
}
