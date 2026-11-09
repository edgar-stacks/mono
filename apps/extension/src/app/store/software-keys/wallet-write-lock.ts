const walletAuthenticationWriteLockName = 'leather:wallet-authentication-write';

interface WalletWriteLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

function getLockManager(): WalletWriteLockManager | undefined {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) return undefined;
  return navigator.locks;
}

export async function withWalletAuthenticationWriteLock<T>(
  fn: () => Promise<T>,
  lockManager: WalletWriteLockManager | undefined = getLockManager()
): Promise<T> {
  if (!lockManager) return fn();
  return lockManager.request(walletAuthenticationWriteLockName, fn);
}
