import { app, baseRequest, requester } from './approval-fixtures';
import type {
  ApprovalAccounts,
  ApprovalMessageFormat,
  ApprovalScenario,
} from './approval-scenario.types';

const gamma = requester('Gamma', 'gamma.io');

function buildMessageRequest(
  { personal }: ApprovalAccounts,
  format: ApprovalMessageFormat,
  body: string
) {
  return baseRequest(personal, {
    kind: 'message',
    title: 'Sign message',
    subtitle: 'Signing proves you control this account. It moves no funds.',
    chain: format === 'bip322' ? 'bitcoin' : 'stacks',
    requester: gamma,
    mode: 'sign-only',
    message: { format, body },
    primaryAction: 'Sign',
  });
}

const outcome = {
  movements: [],
  activityTitle: 'Signed a message for Gamma',
  activityCaption: 'gamma.io',
};

export const messageScenarios: ApprovalScenario[] = [
  {
    id: 'message-signing',
    section: 'messages',
    title: 'Message signing',
    summary: 'Prove account ownership to an app. Nothing is broadcast.',
    app: app(gamma.name, gamma.origin, {
      headline: 'Sign in to Gamma',
      description: 'Sign a message to prove you own this account.',
      actionLabel: 'Sign in with Leather',
    }),
    variants: [
      {
        id: 'plain',
        label: 'Plain text',
        build(accounts) {
          return buildMessageRequest(
            accounts,
            'plain',
            'Welcome to Gamma!\n\nSign to verify you own this account.\n\nNonce: 7f3c91'
          );
        },
        outcome,
      },
      {
        id: 'structured',
        label: 'Structured (SIP-018)',
        build(accounts) {
          return buildMessageRequest(
            accounts,
            'structured',
            '{ domain: "gamma.io", action: "list", token-id: u1042, price: u125000000 }'
          );
        },
        outcome,
      },
      {
        id: 'bip322',
        label: 'Bitcoin (BIP-322)',
        build(accounts) {
          return buildMessageRequest(
            accounts,
            'bip322',
            'gamma.io wants you to sign in with your Bitcoin account.\nIssued at: 2026-11-09T09:00:00Z'
          );
        },
        outcome,
      },
    ],
  },
];
