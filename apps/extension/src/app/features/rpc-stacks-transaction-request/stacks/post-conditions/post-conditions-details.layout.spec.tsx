import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
  postConditionToWire,
} from '@stacks/transactions';
import { cleanup, render, screen } from '@testing-library/react';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type * as LeatherUi from '@leather.io/ui';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('@leather.io/ui', async importOriginal => {
  const actual = await importOriginal<typeof LeatherUi>();
  return {
    ...actual,
    Approver: {
      Section({ children }: { children: React.ReactNode }) {
        return <section>{children}</section>;
      },
      Subheader({ children }: { children: React.ReactNode }) {
        return <h2>{children}</h2>;
      },
    },
  };
});

vi.mock('./post-condition-list', () => ({
  PostConditionList({ postConditions }: { postConditions: PostConditionWire[] }) {
    return (
      <ul>
        {postConditions.map((_, index) => (
          <li key={index} data-testid={PostConditionSelectors.PostConditionItem} />
        ))}
      </ul>
    );
  },
}));

const denyCopy = 'Only fees will be transferred from your account or the transaction will abort.';
const originatorCopy =
  'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.';
const allowWarning = 'This transaction can transfer any of your assets';

const stxPostCondition = postConditionToWire({
  type: 'stx-postcondition',
  address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  condition: 'eq',
  amount: 42,
});

function getBadgeText() {
  return screen.getByTestId(PostConditionSelectors.PostConditionModeBadge).textContent;
}

describe(PostConditionsDetailsLayout.name, () => {
  afterEach(() => cleanup());

  describe('deny mode', () => {
    test('shows the deny badge and the fees only copy without post conditions', () => {
      render(<PostConditionsDetailsLayout postConditions={[]} postConditionMode="deny" />);

      expect(getBadgeText()).toEqual('Deny');
      expect(screen.getByText(denyCopy)).toBeDefined();
      expect(screen.queryByText(originatorCopy)).toBeNull();
      expect(screen.queryByTestId(PostConditionSelectors.PostConditionOriginatorNote)).toBeNull();
    });

    test('shows the deny badge and the list with post conditions', () => {
      render(
        <PostConditionsDetailsLayout
          postConditions={[stxPostCondition]}
          postConditionMode={PostConditionMode.Deny}
        />
      );

      expect(getBadgeText()).toEqual('Deny');
      expect(screen.getAllByTestId(PostConditionSelectors.PostConditionItem)).toHaveLength(1);
      expect(screen.queryByTestId(PostConditionSelectors.NoPostConditions)).toBeNull();
      expect(screen.queryByTestId(PostConditionSelectors.PostConditionOriginatorNote)).toBeNull();
    });

    test('defaults to deny when no mode is given', () => {
      render(<PostConditionsDetailsLayout postConditions={[]} />);

      expect(getBadgeText()).toEqual('Deny');
      expect(screen.getByText(denyCopy)).toBeDefined();
    });
  });

  describe('originator mode', () => {
    test('shows the originator badge and copy without post conditions', () => {
      render(<PostConditionsDetailsLayout postConditions={[]} postConditionMode="originator" />);

      expect(getBadgeText()).toEqual('Originator');
      expect(screen.getByText(originatorCopy)).toBeDefined();
      expect(screen.queryByText(denyCopy)).toBeNull();
    });

    test('shows the originator badge, the list and the note with post conditions', () => {
      render(
        <PostConditionsDetailsLayout
          postConditions={[stxPostCondition]}
          postConditionMode={PostConditionMode.Originator}
        />
      );

      expect(getBadgeText()).toEqual('Originator');
      expect(screen.getAllByTestId(PostConditionSelectors.PostConditionItem)).toHaveLength(1);
      expect(
        screen.getByTestId(PostConditionSelectors.PostConditionOriginatorNote).textContent
      ).toEqual(
        'Only your account is constrained. Contracts this transaction calls can still move their own assets.'
      );
      expect(screen.queryByTestId(PostConditionSelectors.NoPostConditions)).toBeNull();
    });
  });

  describe('allow mode', () => {
    test.each<{ postConditions: PostConditionWire[]; mode: PostConditionModeName }>([
      { postConditions: [], mode: 'allow' },
      { postConditions: [stxPostCondition], mode: 'allow' },
    ])(
      'shows the allow badge and warning with $postConditions.length post conditions',
      ({ postConditions, mode }) => {
        render(
          <PostConditionsDetailsLayout postConditions={postConditions} postConditionMode={mode} />
        );

        expect(getBadgeText()).toEqual('Allow');
        expect(screen.getByText(allowWarning)).toBeDefined();
        expect(screen.queryByTestId(PostConditionSelectors.NoPostConditions)).toBeNull();
        expect(screen.queryByTestId(PostConditionSelectors.PostConditionItem)).toBeNull();
      }
    );

    test('shows the allow badge for the enum mode', () => {
      render(
        <PostConditionsDetailsLayout
          postConditions={[]}
          postConditionMode={PostConditionMode.Allow}
        />
      );

      expect(getBadgeText()).toEqual('Allow');
      expect(screen.getByText(allowWarning)).toBeDefined();
    });
  });
});
