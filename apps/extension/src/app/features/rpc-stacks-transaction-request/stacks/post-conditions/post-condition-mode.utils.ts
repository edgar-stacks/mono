import { PostConditionMode, type PostConditionModeName } from '@stacks/transactions';

export function toPostConditionModeName(
  mode: PostConditionMode | PostConditionModeName = PostConditionMode.Deny
): PostConditionModeName {
  if (mode === PostConditionMode.Allow || mode === 'allow') return 'allow';
  if (mode === PostConditionMode.Originator || mode === 'originator') return 'originator';
  return 'deny';
}
