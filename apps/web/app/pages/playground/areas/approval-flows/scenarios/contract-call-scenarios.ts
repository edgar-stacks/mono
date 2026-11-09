import { assetAmount } from './approval-assets';
import { app, baseRequest, exampleContracts, requester } from './approval-fixtures';
import type { ApprovalMovement, ApprovalScenario } from './approval-scenario.types';

interface GenericCallFixture {
  id: string;
  title: string;
  summary: string;
  requesterName: string;
  origin: string;
  contract: string;
  functionName: string;
  args: string;
  headline: string;
  actionLabel: string;
  actualMovements: ApprovalMovement[];
}

const stacksFee = assetAmount('STX', 0.015);

function genericCallScenario(fixture: GenericCallFixture): ApprovalScenario {
  const callRequester = requester(fixture.requesterName, fixture.origin, false);
  return {
    id: fixture.id,
    section: 'contract-calls',
    title: fixture.title,
    summary: fixture.summary,
    app: app(callRequester.name, callRequester.origin, {
      headline: fixture.headline,
      description: 'This app asks Leather to call a contract Leather does not recognise.',
      actionLabel: fixture.actionLabel,
    }),
    variants: [
      {
        id: 'call',
        label: fixture.functionName,
        build({ personal }) {
          return baseRequest(personal, {
            kind: 'transaction',
            title: fixture.functionName,
            subtitle: `Called on ${fixture.contract.split('.')[1]}`,
            chain: 'stacks',
            requester: callRequester,
            fee: { amount: stacksFee, label: `Set by ${fixture.requesterName}` },
            details: [
              { label: 'Contract', value: fixture.contract, mono: true },
              { label: 'Function', value: fixture.functionName, mono: true },
              { label: 'Arguments', value: fixture.args, mono: true },
            ],
            notices: [
              {
                tone: 'warning',
                title: 'No spending limits',
                body: 'This call sets no post-conditions, so Leather cannot tell what it will move. Only approve calls from apps you trust.',
              },
            ],
          });
        },
        outcome: {
          movements: fixture.actualMovements,
          activityTitle: fixture.functionName,
          activityCaption: fixture.contract,
        },
      },
    ],
  };
}

export const contractCallScenarios: ApprovalScenario[] = [
  genericCallScenario({
    id: 'generic-mint',
    title: 'Generic call: mint',
    summary: 'An NFT mint with no post-conditions.',
    requesterName: 'Mintpad',
    origin: 'mintpad.xyz',
    contract: exampleContracts.nft,
    functionName: 'claim-two',
    args: '(u2)',
    headline: 'Genesis drop',
    actionLabel: 'Mint 2',
    actualMovements: [{ direction: 'out', amount: assetAmount('STX', 60) }],
  }),
  genericCallScenario({
    id: 'generic-vote',
    title: 'Generic call: vote',
    summary: 'A DAO vote that moves nothing.',
    requesterName: 'Stacks DAO',
    origin: 'vote.stacksdao.org',
    contract: exampleContracts.dao,
    functionName: 'vote',
    args: '(u14, true)',
    headline: 'Proposal 14',
    actionLabel: 'Vote yes',
    actualMovements: [],
  }),
  genericCallScenario({
    id: 'generic-router',
    title: 'Generic call: router',
    summary: 'A multi-asset router call Leather cannot interpret.',
    requesterName: 'Yield Router',
    origin: 'yieldrouter.app',
    contract: exampleContracts.unknown,
    functionName: 'rebalance-many',
    args: '(list u1 u4 u7)',
    headline: 'Rebalance positions',
    actionLabel: 'Rebalance',
    actualMovements: [
      { direction: 'out', amount: assetAmount('STX', 80) },
      { direction: 'out', amount: assetAmount('sBTC', 0.0005) },
      { direction: 'in', amount: assetAmount('aeUSDC', 160) },
    ],
  }),
];
