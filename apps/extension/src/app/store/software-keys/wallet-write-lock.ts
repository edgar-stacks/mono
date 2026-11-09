const walletAuthenticationWriteLockName = 'leather:wallet-authentication-write';

export async function withWalletAuthenticationWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(walletAuthenticationWriteLockName, fn);
  }
  return fn();
}
