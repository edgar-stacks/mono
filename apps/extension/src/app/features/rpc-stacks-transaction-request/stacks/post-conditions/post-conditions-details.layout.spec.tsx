import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

import {
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
  postConditionToWire,
} from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('@leather.io/ui', () => ({
  Approver: {
    Section({ children }: { children: ReactNode }) {
      return <section>{children}</section>;
    },
    Subheader({ children }: { children: ReactNode }) {
      return <h2>{children}</h2>;
    },
  },
  Avatar: () => null,
  Badge({ label, ...props }: { label: string }) {
    return <div {...props}>{label}</div>;
  },
  Callout({ title, children }: { title: string; children: ReactNode }) {
    return (
      <div>
        <span>{title}</span>
        <span>{children}</span>
      </div>
    );
  },
  Flag({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  },
  LockIcon: () => null,
}));

vi.mock('./post-condition-list', () => ({
  PostConditionList({ postConditions }: { postConditions: PostConditionWire[] }) {
    return <ul data-testid={PostConditionSelectors.PostConditionItem}>{postConditions.length}</ul>;
  },
}));

const denyCopy = 'Only fees will be transferred from your account or the transaction will abort.';
const originatorCopy =
  'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.';
const originatorNote = 'Only your account is constrained.';
const allowWarning = 'This transaction can transfer any of your assets';

const stxPostCondition = postConditionToWire({
  type: 'stx-postcondition',
  address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  condition: 'lte',
  amount: 1000,
});

function render(
  postConditionMode: PostConditionMode | PostConditionModeName | undefined,
  postConditions: PostConditionWire[]
) {
  return renderToString(
    <PostConditionsDetailsLayout
      postConditionMode={postConditionMode}
      postConditions={postConditions}
    />
  );
}

function getBadgeLabel(html: string) {
  const match = html.match(
    new RegExp(`data-testid="${PostConditionSelectors.PostConditionModeBadge}"[^>]*>([^<]+)<`)
  );
  return match?.[1];
}

describe(PostConditionsDetailsLayout.name, () => {
  test.each([PostConditionMode.Deny, 'deny', undefined] as const)(
    'deny mode (%s) without post conditions shows the deny badge and copy',
    mode => {
      const html = render(mode, []);
      expect(getBadgeLabel(html)).toEqual('Deny');
      expect(html).toContain(denyCopy);
      expect(html).not.toContain(originatorCopy);
      expect(html).not.toContain(allowWarning);
    }
  );

  test('deny mode with post conditions shows the deny badge and the list only', () => {
    const html = render(PostConditionMode.Deny, [stxPostCondition]);
    expect(getBadgeLabel(html)).toEqual('Deny');
    expect(html).toContain(PostConditionSelectors.PostConditionItem);
    expect(html).not.toContain(denyCopy);
    expect(html).not.toContain(originatorNote);
  });

  test.each([PostConditionMode.Originator, 'originator'] as const)(
    'originator mode (%s) without post conditions shows the originator badge and copy',
    mode => {
      const html = render(mode, []);
      expect(getBadgeLabel(html)).toEqual('Originator');
      expect(html).toContain(originatorCopy);
      expect(html).not.toContain(denyCopy);
    }
  );

  test('originator mode with post conditions shows the list and the originator note', () => {
    const html = render(PostConditionMode.Originator, [stxPostCondition]);
    expect(getBadgeLabel(html)).toEqual('Originator');
    expect(html).toContain(PostConditionSelectors.PostConditionItem);
    expect(html).toContain(PostConditionSelectors.OriginatorModeNote);
    expect(html).toContain(originatorNote);
    expect(html).not.toContain(originatorCopy);
  });

  test.each([PostConditionMode.Allow, 'allow'] as const)(
    'allow mode (%s) without post conditions shows the allow badge and warning',
    mode => {
      const html = render(mode, []);
      expect(getBadgeLabel(html)).toEqual('Allow');
      expect(html).toContain(allowWarning);
      expect(html).not.toContain(denyCopy);
    }
  );

  test('allow mode with post conditions shows the allow badge and warning', () => {
    const html = render(PostConditionMode.Allow, [stxPostCondition]);
    expect(getBadgeLabel(html)).toEqual('Allow');
    expect(html).toContain(allowWarning);
    expect(html).not.toContain(PostConditionSelectors.PostConditionItem);
  });
});
