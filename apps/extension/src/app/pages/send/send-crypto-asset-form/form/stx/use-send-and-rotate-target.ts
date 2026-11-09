import { useFlags } from '@app/features/feature-flags';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useStacksRotationTargetAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

export function useSendAndRotateTarget() {
  const { stxSendAndRotate } = useFlags();
  const policy = useCurrentPolicy();
  const isStacksPolicy = policy?.chain === 'stacks';
  const target = useStacksRotationTargetAccount();
  const isEnabled = stxSendAndRotate && !isStacksPolicy;
  const { data: targetNextNonce } = useNextNonce(isEnabled && target ? target.address : '');

  if (!isEnabled || !target) return;
  if (targetNextNonce?.nonce !== 0) return;
  return target;
}
