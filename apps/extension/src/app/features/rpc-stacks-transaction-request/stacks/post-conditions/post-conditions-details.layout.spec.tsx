import { renderToString } from 'react-dom/server';

import { Pc, PostConditionMode, postConditionToWire } from '@stacks/transactions';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('@leather.io/ui', () => {
  const Approver = {
    Section({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    Subheader({ children }: { children: React.ReactNode }) {
      return <h2>{children}</h2>;
    },
  };
  return {
    Approver,
    Avatar: () => null,
    Badge({ label }: { label: string }) {
      return <span data-badge="">{label}</span>;
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
    LockIcon: () => null,
  };
});

vi.mock('./post-condition-list', () => ({
  PostConditionList: () => <ul>post-condition-list</ul>,
}));

const denyCopy = 'Only fees will be transferred from your account or the transaction will abort.';
const originatorCopy =
  'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.';
const originatorNote =
  'Only your account is constrained. Contracts this transaction calls can still move their own assets.';
const allowWarning = 'This transaction can transfer any of your assets';

const postConditions = [
  postConditionToWire(
    Pc.principal('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE').willSendEq(1).ustx()
  ),
];

function renderLayout(
  postConditionMode: Parameters<typeof PostConditionsDetailsLayout>[0]['postConditionMode'],
  withPostConditions: boolean
) {
  return renderToString(
    <PostConditionsDetailsLayout
      postConditions={withPostConditions ? postConditions : []}
      postConditionMode={postConditionMode}
    />
  );
}

function getBadgeText(html: string) {
  return /<span data-badge="">([^<]*)<\/span>/.exec(html)?.[1];
}

describe(PostConditionsDetailsLayout.name, () => {
  describe('deny mode', () => {
    test.each([PostConditionMode.Deny, 'deny' as const, undefined])(
      'shows the Deny badge and the deny copy without post conditions (%s)',
      mode => {
        const html = renderLayout(mode, false);

        expect(getBadgeText(html)).toBe('Deny');
        expect(html).toContain(denyCopy);
        expect(html).not.toContain(originatorNote);
      }
    );

    test('shows the Deny badge and the list with post conditions', () => {
      const html = renderLayout(PostConditionMode.Deny, true);

      expect(getBadgeText(html)).toBe('Deny');
      expect(html).toContain('post-condition-list');
      expect(html).not.toContain(denyCopy);
      expect(html).not.toContain(originatorNote);
    });
  });

  describe('originator mode', () => {
    test.each([PostConditionMode.Originator, 'originator' as const])(
      'shows the Originator badge and the originator copy without post conditions (%s)',
      mode => {
        const html = renderLayout(mode, false);

        expect(getBadgeText(html)).toBe('Originator');
        expect(html).toContain(originatorCopy);
        expect(html).not.toContain(denyCopy);
      }
    );

    test('shows the Originator badge, the list and the note with post conditions', () => {
      const html = renderLayout(PostConditionMode.Originator, true);

      expect(getBadgeText(html)).toBe('Originator');
      expect(html).toContain('post-condition-list');
      expect(html).toContain(originatorNote);
      expect(html).not.toContain(originatorCopy);
    });
  });

  describe('allow mode', () => {
    test.each([
      [PostConditionMode.Allow, false],
      ['allow' as const, false],
      [PostConditionMode.Allow, true],
    ])('shows the Allow badge and the warning (%s, with post conditions: %s)', (mode, withPcs) => {
      const html = renderLayout(mode, withPcs);

      expect(getBadgeText(html)).toBe('Allow');
      expect(html).toContain(allowWarning);
      expect(html).not.toContain(denyCopy);
      expect(html).not.toContain(originatorCopy);
      expect(html).not.toContain('post-condition-list');
    });
  });
});
