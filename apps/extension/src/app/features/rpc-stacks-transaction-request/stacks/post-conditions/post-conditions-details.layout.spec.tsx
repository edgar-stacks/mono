import { renderToString } from 'react-dom/server';

import {
  Pc,
  PostConditionMode,
  type PostConditionModeName,
  type PostConditionWire,
  postConditionToWire,
} from '@stacks/transactions';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('./post-condition-list', () => ({
  PostConditionList({ postConditions }: { postConditions: PostConditionWire[] }) {
    return <div>{`post-condition-list:${postConditions.length}`}</div>;
  },
}));

vi.mock('@leather.io/ui', () => {
  const Approver = {
    Section({ children }: { children: React.ReactNode }) {
      return <section>{children}</section>;
    },
    Subheader({ children }: { children: React.ReactNode }) {
      return <h2>{children}</h2>;
    },
  };
  return {
    Approver,
    Avatar() {
      return null;
    },
    Badge({ label, variant }: { label: string; variant?: string }) {
      return <span data-variant={variant}>{`badge:${label}`}</span>;
    },
    Callout({ title, children }: { title: string; children: React.ReactNode }) {
      return (
        <div>
          {title}
          {children}
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

const postConditions = [
  postConditionToWire(
    Pc.principal('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE').willSendEq(1).ustx()
  ),
];

function render(
  postConditionMode: PostConditionMode | PostConditionModeName | undefined,
  pcs: PostConditionWire[]
) {
  return renderToString(
    <PostConditionsDetailsLayout postConditions={pcs} postConditionMode={postConditionMode} />
  );
}

describe(PostConditionsDetailsLayout.name, () => {
  describe('deny mode', () => {
    test.each([PostConditionMode.Deny, 'deny' as const, undefined])(
      'shows the deny badge and copy without post conditions (%s)',
      mode => {
        const html = render(mode, []);
        expect(html).toContain('badge:Deny');
        expect(html).toContain(denyCopy);
        expect(html).not.toContain(originatorNote);
        expect(html).not.toContain(allowWarning);
      }
    );

    test('shows the deny badge and the list with post conditions', () => {
      const html = render(PostConditionMode.Deny, postConditions);
      expect(html).toContain('badge:Deny');
      expect(html).toContain('post-condition-list:1');
      expect(html).not.toContain(denyCopy);
      expect(html).not.toContain(originatorNote);
    });
  });

  describe('originator mode', () => {
    test.each([PostConditionMode.Originator, 'originator' as const])(
      'shows the originator badge and copy without post conditions (%s)',
      mode => {
        const html = render(mode, []);
        expect(html).toContain('badge:Originator');
        expect(html).toContain(originatorCopy);
        expect(html).not.toContain(denyCopy);
      }
    );

    test('shows the originator badge, the list and the note with post conditions', () => {
      const html = render('originator', postConditions);
      expect(html).toContain('badge:Originator');
      expect(html).toContain('post-condition-list:1');
      expect(html).toContain(originatorNote);
      expect(html).not.toContain(originatorCopy);
    });
  });

  describe('allow mode', () => {
    test.each([
      [PostConditionMode.Allow, []],
      ['allow' as const, []],
      [PostConditionMode.Allow, postConditions],
    ])('shows the allow badge and the warning (%s)', (mode, pcs) => {
      const html = render(mode, pcs);
      expect(html).toContain('badge:Allow');
      expect(html).toContain(allowWarning);
      expect(html).not.toContain(denyCopy);
      expect(html).not.toContain(originatorCopy);
      expect(html).not.toContain(originatorNote);
    });
  });
});
