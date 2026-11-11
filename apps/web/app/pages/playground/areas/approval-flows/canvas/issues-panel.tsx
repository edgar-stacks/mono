import { Flex, styled } from 'leather-styles/jsx';

import { formatAssetAmount } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-model';

interface ReviewQuestion {
  id: string;
  question: string;
  answer: string;
  status: 'clear' | 'attention';
}

function movementAnswer(request: ApprovalRequest): Pick<ReviewQuestion, 'answer' | 'status'> {
  if (request.kind === 'connect')
    return { answer: 'Nothing. Addresses and public keys are shared.', status: 'clear' };
  if (request.kind === 'message')
    return { answer: 'Nothing. A signature goes back to the app.', status: 'clear' };
  if (request.movements.length > 0) {
    const moves = request.movements
      .map(
        movement =>
          `${movement.direction === 'out' ? 'Sends' : 'Receives'} ${formatAssetAmount(movement.value)}${movement.estimated ? ' (estimated)' : ''}`
      )
      .join(', ');
    return { answer: moves, status: 'clear' };
  }
  if (request.limits?.mode === 'allow') {
    return { answer: 'Unknown. No limits, so nothing can be estimated.', status: 'attention' };
  }
  return { answer: 'Nothing leaves the account.', status: 'clear' };
}

function limitsAnswer(request: ApprovalRequest): Pick<ReviewQuestion, 'answer' | 'status'> {
  if (!request.limits) return { answer: 'Not applicable to this request.', status: 'clear' };
  if (request.limits.mode === 'allow' || request.limits.rules.length === 0) {
    return { answer: 'None. The call can move any token it reaches.', status: 'attention' };
  }
  return { answer: request.limits.rules.join('; '), status: 'clear' };
}

function reviewQuestions(request: ApprovalRequest): ReviewQuestion[] {
  const signer = `${request.signer.accountName}${request.signer.kind === 'ledger' ? ' on Ledger' : ''}`;
  return [
    {
      id: 'requester',
      question: 'Who is asking?',
      answer: `${request.requester.name} · ${request.requester.origin}${request.requester.firstVisit ? ' · first visit' : ''}`,
      status: request.requester.firstVisit ? 'attention' : 'clear',
    },
    {
      id: 'signer',
      question: 'Which account or vault signs?',
      answer: request.vault ? `${request.vault.name} funds, your signature from ${signer}` : signer,
      status: 'clear',
    },
    { id: 'movements', question: 'What moves?', ...movementAnswer(request) },
    {
      id: 'fee',
      question: 'What does it cost?',
      answer: request.fee ? formatAssetAmount(request.fee.value) : 'No fee.',
      status: 'clear',
    },
    { id: 'limits', question: 'Which limits are enforced?', ...limitsAnswer(request) },
    {
      id: 'after',
      question: 'What happens after signing?',
      answer: request.afterApproval,
      status: 'clear',
    },
  ];
}

export function IssuesPanel({ request }: { request: ApprovalRequest }) {
  const questions = reviewQuestions(request);
  const attention = questions.filter(question => question.status === 'attention').length;
  return (
    <Flex direction="column" gap="space.03" width="100%" maxWidth="360px">
      <Flex justifyContent="space-between" alignItems="baseline">
        <styled.h2 textStyle="label.02" color="ink.text-primary">
          Review questions
        </styled.h2>
        <styled.span
          textStyle="caption.01"
          color={attention > 0 ? 'red.action-primary-default' : 'ink.text-subdued'}
        >
          {attention > 0 ? `${attention} need attention` : 'All answered'}
        </styled.span>
      </Flex>
      <styled.ul display="flex" flexDirection="column" gap="space.03">
        {questions.map(question => (
          <styled.li
            key={question.id}
            display="flex"
            flexDirection="column"
            gap="space.01"
            pl="space.03"
            borderLeftWidth="2px"
            borderLeftStyle="solid"
            borderColor={question.status === 'attention' ? 'red.border' : 'green.border'}
          >
            <styled.span textStyle="label.03" color="ink.text-primary">
              {question.question}
            </styled.span>
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {question.answer}
            </styled.span>
          </styled.li>
        ))}
      </styled.ul>
    </Flex>
  );
}
