import { useState } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Badge, Button, Callout } from '@leather.io/ui';

import { DetailRow, PopupFrame, SponsoredBadge } from './popup-frame';

type BundleStep = 'request' | 'review' | 'sent';

const sponsorAddress = 'SP3SPONSR0LEATHER9K2V1QZ4M7XWB8N5HTD0CJ';
const feeSbtc = '0.00000210 sBTC';
const contractId = 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.univ2-router';
const functionName = 'swap-exact-tokens-for-tokens';

interface BundleTransaction {
  position: number;
  title: string;
  rows: { label: string; value: string }[];
  isSponsored: boolean;
}

const bundleTransactions: BundleTransaction[] = [
  {
    position: 1,
    title: 'sBTC fee transfer to sponsor',
    rows: [
      { label: 'To', value: sponsorAddress },
      { label: 'Amount', value: feeSbtc },
      { label: 'Nonce', value: '42' },
    ],
    isSponsored: false,
  },
  {
    position: 2,
    title: 'Contract call',
    rows: [
      { label: 'Contract', value: contractId },
      { label: 'Function', value: functionName },
      { label: 'Nonce', value: '43' },
    ],
    isSponsored: true,
  },
];

interface TransactionCardProps {
  transaction: BundleTransaction;
  status?: string;
}

function TransactionCard({ transaction, status }: TransactionCardProps) {
  return (
    <Stack
      gap="space.01"
      p="space.03"
      borderWidth={1}
      borderColor="ink.border-default"
      borderRadius="sm"
    >
      <Flex justifyContent="space-between" alignItems="center" gap="space.02">
        <styled.span textStyle="label.02">
          {`Tx ${transaction.position}: ${transaction.title}`}
        </styled.span>
        {transaction.isSponsored && <SponsoredBadge />}
      </Flex>
      {transaction.rows.map(row => (
        <DetailRow key={row.label} label={row.label} value={row.value} />
      ))}
      {status && <DetailRow label="Status" value={status} />}
    </Stack>
  );
}

export function ContractCallBundleFlow() {
  const [step, setStep] = useState<BundleStep>('request');

  if (step === 'sent') {
    return (
      <PopupFrame
        title="Submitted"
        onBack={() => setStep('request')}
        footer={
          <Button fullWidth onClick={() => setStep('request')}>
            Restart
          </Button>
        }
      >
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Both transactions were broadcast in order. The contract call lands after the fee transfer.
        </styled.p>
        {bundleTransactions.map(transaction => (
          <TransactionCard key={transaction.position} transaction={transaction} status="Pending" />
        ))}
      </PopupFrame>
    );
  }

  if (step === 'review') {
    return (
      <PopupFrame
        title="Review 2 transactions"
        onBack={() => setStep('request')}
        footer={
          <Button fullWidth onClick={() => setStep('sent')}>
            Confirm both
          </Button>
        }
      >
        <Callout variant="info" title="Two transactions">
          To sponsor this contract call, Leather first sends the sBTC fee to the sponsor. Both are
          signed together.
        </Callout>
        {bundleTransactions.map(transaction => (
          <TransactionCard key={transaction.position} transaction={transaction} />
        ))}
      </PopupFrame>
    );
  }

  return (
    <PopupFrame
      title="Contract call"
      footer={
        <Button fullWidth onClick={() => setStep('review')}>
          Continue
        </Button>
      }
    >
      <Flex>
        <Badge variant="warning" label="Planned" size="sm" />
      </Flex>
      <styled.p textStyle="body.02" color="ink.text-subdued">
        app.example.xyz requests a contract call.
      </styled.p>
      <Stack gap="0">
        <DetailRow label="Contract" value={contractId} />
        <DetailRow label="Function" value={functionName} />
        <DetailRow label="Fee (sBTC)" value={feeSbtc} badge={<SponsoredBadge />} />
      </Stack>
    </PopupFrame>
  );
}
