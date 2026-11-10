import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
  postConditionToWire,
} from '@stacks/transactions';
import { cleanup, render, screen } from '@testing-library/react';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('@leather.io/ui', () => {
  function Passthrough({ children }: { children?: React.ReactNode }) {
    return <div>{children}</div>;
  }
  return {
    Approver: { Section: Passthrough, Subheader: Passthrough },
    Avatar() {
      return null;
    },
    Badge({ label, ...props }: { label: string; 'data-testid'?: string }) {
      return <span data-testid={props['data-testid']}>{label}</span>;
    },
    Callout({
      title,
      children,
      ...props
    }: {
      title: string;
      children: React.ReactNode;
      'data-testid'?: string;
    }) {
      return (
        <div data-testid={props['data-testid']}>
          <span>{title}</span>
          <span>{children}</span>
        </div>
      );
    },
    Flag: Passthrough,
    LockIcon() {
      return null;
    },
  };
});

vi.mock('./post-condition-list', () => ({
  PostConditionList({ postConditions }: { postConditions: PostConditionWire[] }) {
    return <div data-testid="post-condition-list">{postConditions.length}</div>;
  },
}));

const denyCopy = 'Only fees will be transferred from your account or the transaction will abort.';
const originatorCopy =
  'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.';
const originatorNote =
  'Only your account is constrained. Contracts this transaction calls can still move their own assets.';
const allowWarningTitle = 'This transaction can transfer any of your assets';

const stxPostCondition = postConditionToWire({
  type: 'stx-postcondition',
  address: 'SP000000000000000000002Q6VF78',
  condition: 'eq',
  amount: 42,
});

type ModeInput = PostConditionMode | PostConditionModeName | undefined;

const denyModes: [string, ModeInput][] = [
  ['enum', PostConditionMode.Deny],
  ['name', 'deny'],
  ['default', undefined],
];
const originatorModes: [string, ModeInput][] = [
  ['enum', PostConditionMode.Originator],
  ['name', 'originator'],
];
const allowModes: [string, ModeInput][] = [
  ['enum', PostConditionMode.Allow],
  ['name', 'allow'],
];

afterEach(() => cleanup());

function renderLayout(postConditionMode: ModeInput, postConditions: PostConditionWire[]) {
  render(
    <PostConditionsDetailsLayout
      postConditionMode={postConditionMode}
      postConditions={postConditions}
    />
  );
}

function getBadgeText() {
  return screen.getByTestId(PostConditionSelectors.PostConditionModeBadge).textContent;
}

describe(PostConditionsDetailsLayout.name, () => {
  describe.each(denyModes)('deny mode (%s)', (_, mode) => {
    test('shows the Deny badge and the deny copy without post conditions', () => {
      renderLayout(mode, []);
      expect(getBadgeText()).toEqual('Deny');
      expect(
        screen.getByTestId(PostConditionSelectors.NoPostConditionsMessage).textContent
      ).toEqual(denyCopy);
      expect(screen.queryByTestId(PostConditionSelectors.OriginatorModeNote)).toBeNull();
    });

    test('shows the Deny badge and the list with post conditions', () => {
      renderLayout(mode, [stxPostCondition]);
      expect(getBadgeText()).toEqual('Deny');
      expect(screen.getByTestId('post-condition-list').textContent).toEqual('1');
      expect(screen.queryByTestId(PostConditionSelectors.NoPostConditionsMessage)).toBeNull();
      expect(screen.queryByTestId(PostConditionSelectors.OriginatorModeNote)).toBeNull();
    });
  });

  describe.each(originatorModes)('originator mode (%s)', (_, mode) => {
    test('shows the Originator badge and the originator copy without post conditions', () => {
      renderLayout(mode, []);
      expect(getBadgeText()).toEqual('Originator');
      expect(
        screen.getByTestId(PostConditionSelectors.NoPostConditionsMessage).textContent
      ).toEqual(originatorCopy);
      expect(screen.queryByTestId(PostConditionSelectors.OriginatorModeNote)).toBeNull();
    });

    test('shows the Originator badge, the list and the originator note with post conditions', () => {
      renderLayout(mode, [stxPostCondition]);
      expect(getBadgeText()).toEqual('Originator');
      expect(screen.getByTestId('post-condition-list').textContent).toEqual('1');
      expect(screen.getByTestId(PostConditionSelectors.OriginatorModeNote).textContent).toEqual(
        originatorNote
      );
      expect(screen.queryByTestId(PostConditionSelectors.NoPostConditionsMessage)).toBeNull();
    });
  });

  describe.each(allowModes)('allow mode (%s)', (_, mode) => {
    test.each([
      ['without', []],
      ['with', [stxPostCondition]],
    ])('shows the Allow badge and the warning %s post conditions', (__, postConditions) => {
      renderLayout(mode, postConditions);
      expect(getBadgeText()).toEqual('Allow');
      expect(
        screen.getByTestId(PostConditionSelectors.PostConditionModeWarning).textContent
      ).toContain(allowWarningTitle);
      expect(screen.queryByTestId(PostConditionSelectors.NoPostConditionsMessage)).toBeNull();
      expect(screen.queryByTestId(PostConditionSelectors.OriginatorModeNote)).toBeNull();
      expect(screen.queryByTestId('post-condition-list')).toBeNull();
    });
  });
});
