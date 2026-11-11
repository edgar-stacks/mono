const walletAuthenticationWriteLockName = 'leather:wallet-authentication-write';

export async function withWalletWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    throw new Error('Wallet write lock is unavailable');
  }
  return navigator.locks.request(walletAuthenticationWriteLockName, { mode: 'exclusive' }, fn);
}
