import { renderToString } from 'react-dom/server';

import { PostConditionMode } from '@stacks/transactions';

import type * as LeatherUi from '@leather.io/ui';

import { PostConditionsDetailsLayout } from './post-conditions-details.layout';

vi.mock('@leather.io/ui', async importOriginal => ({
  ...(await importOriginal<typeof LeatherUi>()),
  Approver: {
    Section({ children }: { children: React.ReactNode }) {
      return <section>{children}</section>;
    },
    Subheader({ children }: { children: React.ReactNode }) {
      return <h2>{children}</h2>;
    },
  },
}));

const originatorNoticeTitle = 'Only your account is protected';
const noPostConditionsCopy =
  'Only fees will be transferred from your account or the transaction will abort.';

describe(PostConditionsDetailsLayout.name, () => {
  test('shows the originator notice for originator mode', () => {
    const html = renderToString(
      <PostConditionsDetailsLayout postConditions={[]} postConditionMode="originator" />
    );
    expect(html).toContain(noPostConditionsCopy);
    expect(html).toContain(originatorNoticeTitle);
  });

  test('shows the originator notice for the originator mode enum', () => {
    const html = renderToString(
      <PostConditionsDetailsLayout
        postConditions={[]}
        postConditionMode={PostConditionMode.Originator}
      />
    );
    expect(html).toContain(originatorNoticeTitle);
  });

  test('does not show the originator notice for deny mode', () => {
    const html = renderToString(
      <PostConditionsDetailsLayout postConditions={[]} postConditionMode="deny" />
    );
    expect(html).toContain(noPostConditionsCopy);
    expect(html).not.toContain(originatorNoticeTitle);
  });

  test('does not show the originator notice when the mode is not given', () => {
    const html = renderToString(<PostConditionsDetailsLayout postConditions={[]} />);
    expect(html).not.toContain(originatorNoticeTitle);
  });
});
