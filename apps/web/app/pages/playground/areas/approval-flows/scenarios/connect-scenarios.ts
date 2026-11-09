import { app, baseRequest, requester } from './approval-fixtures';
import type { ApprovalScenario } from './approval-scenario.types';

const alexLab = requester('Alex Lab', 'app.alexlab.co');

export const connectScenarios: ApprovalScenario[] = [
  {
    id: 'connect',
    section: 'connect',
    title: 'Connect',
    summary: 'An app asks to see an account. Sharing a known account needs no signature.',
    app: app(alexLab.name, alexLab.origin, {
      headline: 'Trade Bitcoin DeFi',
      description: 'Connect a wallet to see balances and positions.',
      actionLabel: 'Connect wallet',
    }),
    variants: [
      {
        id: 'first',
        label: 'First connection',
        build({ personal }) {
          return baseRequest(personal, {
            kind: 'connect',
            title: 'Connect to Alex Lab',
            subtitle: 'Alex Lab will see the addresses of the account you share.',
            chain: 'stacks',
            requester: alexLab,
            mode: 'sign-only',
            permissions: [
              'See the Bitcoin and Stacks addresses of this account',
              'See balances and Activity for this account',
              'Ask you to approve requests',
            ],
            notices: [
              {
                tone: 'info',
                title: 'Nothing moves on connect',
                body: 'Every later request opens Leather for your approval.',
              },
            ],
            primaryAction: 'Connect',
          });
        },
        outcome: {
          movements: [],
          activityTitle: 'Connected to Alex Lab',
          activityCaption: 'app.alexlab.co',
        },
      },
    ],
  },
];
