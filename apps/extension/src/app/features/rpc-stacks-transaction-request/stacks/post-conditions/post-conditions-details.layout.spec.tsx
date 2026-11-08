import { renderToString } from 'react-dom/server';

import { PostConditionMode, type PostConditionModeName } from '@stacks/transactions';

import { ensurePostConditionWireFormat } from '@leather.io/stacks';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('./post-condition-list', () => ({
  PostConditionList({ postConditions }: { postConditions: unknown[] }) {
    return <div>{`post-condition-list:${postConditions.length}`}</div>;
  },
}));

vi.mock('@leather.io/ui', () => {
  const Approver = {
    Section({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    Subheader({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
  };
  return {
    Approver,
    Avatar() {
      return null;
    },
    Badge({ label }: { label: string }) {
      return <span>{`badge:${label}`}</span>;
    },
    Callout({ title, children }: { title: string; children: React.ReactNode }) {
      return (
        <div>
          <span>{title}</span>
          <span>{children}</span>
        </div>
      );
    },
    Flag({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    LockIcon() {
      return null;
    },
  };
});

const denyCopy = 'Only fees will be transferred from your account or the transaction will abort.';
const originatorCopy =
  'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.';
const originatorNote = 'Only your account is constrained.';
const allowWarning = 'This transaction can transfer any of your assets';

const postCondition = ensurePostConditionWireFormat(
  '00021a8813c5086ddf53beada66744d40b1dcd0ac1d42001000000000000002a'
);

function renderLayout(
  postConditionMode: PostConditionMode | PostConditionModeName | undefined,
  withPostConditions: boolean
) {
  return renderToString(
    <PostConditionsDetailsLayout
      postConditions={withPostConditions ? [postCondition] : []}
      postConditionMode={postConditionMode}
    />
  );
}

describe(PostConditionsDetailsLayout.name, () => {
  test.each([PostConditionMode.Deny, 'deny', undefined] as const)(
    'shows the deny badge and copy with no post conditions in %s mode',
    mode => {
      const html = renderLayout(mode, false);

      expect(html).toContain('Post conditions');
      expect(html).toContain('badge:Deny');
      expect(html).toContain(denyCopy);
      expect(html).not.toContain(originatorCopy);
      expect(html).not.toContain(allowWarning);
    }
  );

  test('shows the deny badge and the list with post conditions in deny mode', () => {
    const html = renderLayout(PostConditionMode.Deny, true);

    expect(html).toContain('badge:Deny');
    expect(html).toContain('post-condition-list:1');
    expect(html).not.toContain(denyCopy);
    expect(html).not.toContain(originatorNote);
  });

  test.each([PostConditionMode.Originator, 'originator'] as const)(
    'shows the originator badge and copy with no post conditions in %s mode',
    mode => {
      const html = renderLayout(mode, false);

      expect(html).toContain('badge:Originator');
      expect(html).toContain(originatorCopy);
      expect(html).not.toContain(denyCopy);
      expect(html).not.toContain(allowWarning);
    }
  );

  test('shows the originator badge, note and list with post conditions in originator mode', () => {
    const html = renderLayout(PostConditionMode.Originator, true);

    expect(html).toContain('badge:Originator');
    expect(html).toContain(originatorNote);
    expect(html).toContain('Contracts this transaction calls can still move');
    expect(html).toContain('post-condition-list:1');
    expect(html).not.toContain(originatorCopy);
  });

  test.each([
    [PostConditionMode.Allow, false],
    ['allow', false],
    [PostConditionMode.Allow, true],
  ] as const)(
    'shows the allow badge and warning in %s mode (post conditions: %s)',
    (mode, withPcs) => {
      const html = renderLayout(mode, withPcs);

      expect(html).toContain('badge:Allow');
      expect(html).toContain(allowWarning);
      expect(html).not.toContain(denyCopy);
      expect(html).not.toContain(originatorCopy);
      expect(html).not.toContain('post-condition-list');
    }
  );
});
