import { renderToString } from 'react-dom/server';

import { PostConditionMode } from '@stacks/transactions';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('@leather.io/ui', () => ({
  Approver: {
    Section({ children }: { children: React.ReactNode }) {
      return <section>{children}</section>;
    },
    Subheader({ children }: { children: React.ReactNode }) {
      return <h2>{children}</h2>;
    },
  },
  Avatar() {
    return null;
  },
  Badge({ label }: { label: string }) {
    return <span>{label}</span>;
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
}));

vi.mock('./post-condition-list', () => ({
  PostConditionList() {
    return null;
  },
}));

const denyMessage =
  'Nothing will leave your account, and every asset movement in this transaction must be listed below or it will abort.';
const originatorMessage =
  'Nothing will leave your account beyond fees. This contract may still move its own assets.';

describe(PostConditionsDetailsLayout.name, () => {
  test('shows the deny copy and badge when the mode is deny', () => {
    const html = renderToString(
      <PostConditionsDetailsLayout postConditions={[]} postConditionMode="deny" />
    );

    expect(html).toContain(denyMessage);
    expect(html).toContain('Deny mode');
    expect(html).not.toContain(originatorMessage);
  });

  test('defaults to deny when no mode is given', () => {
    const html = renderToString(<PostConditionsDetailsLayout postConditions={[]} />);

    expect(html).toContain(denyMessage);
    expect(html).toContain('Deny mode');
  });

  test.each(['originator', PostConditionMode.Originator] as const)(
    'shows the originator copy and badge when the mode is %s',
    postConditionMode => {
      const html = renderToString(
        <PostConditionsDetailsLayout postConditions={[]} postConditionMode={postConditionMode} />
      );

      expect(html).toContain(originatorMessage);
      expect(html).toContain('Originator mode');
      expect(html).not.toContain(denyMessage);
    }
  );

  test.each(['allow', PostConditionMode.Allow] as const)(
    'shows the allow warning and badge when the mode is %s',
    postConditionMode => {
      const html = renderToString(
        <PostConditionsDetailsLayout postConditions={[]} postConditionMode={postConditionMode} />
      );

      expect(html).toContain('This transaction can transfer any of your assets');
      expect(html).toContain('Allow mode');
    }
  );
});
