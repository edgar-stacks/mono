import { useState } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, Input, Switch } from '@leather.io/ui';

import { DetailRow, PopupFrame, SponsoredBadge } from './popup-frame';

type SendStep = 'form' | 'review' | 'sent';

interface FeeOption {
  id: string;
  label: string;
  sbtc: number;
}

const standardFee: FeeOption = { id: 'standard', label: 'Standard', sbtc: 0.0000018 };

const feeOptions: FeeOption[] = [
  { id: 'low', label: 'Low', sbtc: 0.0000012 },
  standardFee,
  { id: 'high', label: 'High', sbtc: 0.0000025 },
];

const sampleNonce = 42;
const sbtcDecimals = 8;

function formatSbtc(value: number) {
  return `${value.toFixed(sbtcDecimals)} sBTC`;
}

export function SponsoredSendFlow() {
  const [step, setStep] = useState<SendStep>('form');
  const [amount, setAmount] = useState('0.0015');
  const [recipient, setRecipient] = useState('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
  const [memo, setMemo] = useState('Thanks for lunch');
  const [feeId, setFeeId] = useState(standardFee.id);
  const [showQuoteUpdated, setShowQuoteUpdated] = useState(false);

  const fee = feeOptions.find(option => option.id === feeId) ?? standardFee;
  const amountNumber = Number(amount);
  const isValid = Number.isFinite(amountNumber) && amountNumber > 0 && recipient.length > 0;
  const feeSbtc = fee.sbtc;
  const total = formatSbtc((isValid ? amountNumber : 0) + feeSbtc);

  function restart() {
    setStep('form');
    setShowQuoteUpdated(false);
  }

  if (step === 'sent') {
    return (
      <PopupFrame
        title="Sent"
        onBack={restart}
        footer={
          <Button fullWidth onClick={restart}>
            Restart
          </Button>
        }
      >
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Your sBTC transfer was broadcast. The sponsor paid the STX network fee.
        </styled.p>
        <Stack gap="0">
          <DetailRow label="Total spend" value={total} />
          <DetailRow label="Sending" value={formatSbtc(amountNumber)} />
          <DetailRow label="Fee" value={formatSbtc(feeSbtc)} badge={<SponsoredBadge />} />
          <DetailRow label="Memo" value={memo || 'None'} />
          <DetailRow label="Nonce" value={sampleNonce} />
        </Stack>
      </PopupFrame>
    );
  }

  if (step === 'review') {
    return (
      <PopupFrame
        title="Review"
        onBack={() => setStep('form')}
        footer={
          <Button fullWidth onClick={() => setStep('sent')}>
            Confirm
          </Button>
        }
      >
        <Flex alignItems="center" justifyContent="space-between">
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Simulate fee quote refresh
          </styled.span>
          <Switch.Root
            checked={showQuoteUpdated}
            onCheckedChange={setShowQuoteUpdated}
            aria-label="Simulate fee quote refresh"
          >
            <Switch.Thumb />
          </Switch.Root>
        </Flex>
        {showQuoteUpdated && (
          <Callout variant="info" title="Fee quote updated">
            The sBTC fee was refreshed. Review the updated total and confirm again.
          </Callout>
        )}
        <Stack gap="0">
          <DetailRow label="To" value={recipient} />
          <DetailRow label="Total spend" value={total} />
          <DetailRow label="Sending" value={formatSbtc(amountNumber)} />
          <DetailRow label="Fee (sBTC)" value={formatSbtc(feeSbtc)} badge={<SponsoredBadge />} />
          <DetailRow label="Memo" value={memo || 'None'} />
          <DetailRow label="Nonce" value={sampleNonce} />
        </Stack>
      </PopupFrame>
    );
  }

  return (
    <PopupFrame
      title="Send sBTC"
      footer={
        <Button fullWidth disabled={!isValid} onClick={() => setStep('review')}>
          Continue
        </Button>
      }
    >
      <Input.Root data-shrink>
        <Input.Label>Amount (sBTC)</Input.Label>
        <Input.Field
          aria-label="Amount (sBTC)"
          inputMode="decimal"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />
      </Input.Root>
      <Input.Root data-shrink>
        <Input.Label>Recipient</Input.Label>
        <Input.Field
          aria-label="Recipient"
          value={recipient}
          onChange={event => setRecipient(event.target.value)}
        />
      </Input.Root>
      <Input.Root data-shrink>
        <Input.Label>Memo</Input.Label>
        <Input.Field
          aria-label="Memo"
          value={memo}
          onChange={event => setMemo(event.target.value)}
        />
      </Input.Root>
      <Stack gap="space.02">
        <Flex alignItems="center" gap="space.02">
          <styled.span textStyle="label.02">Fee</styled.span>
          <SponsoredBadge />
        </Flex>
        <Flex gap="space.02" role="radiogroup" aria-label="Fee">
          {feeOptions.map(option => (
            <styled.button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === feeId}
              onClick={() => setFeeId(option.id)}
              flex="1"
              p="space.02"
              borderWidth={1}
              borderRadius="sm"
              borderColor={
                option.id === feeId ? 'ink.action-primary-default' : 'ink.border-default'
              }
              cursor="pointer"
              textAlign="left"
            >
              <styled.span display="block" textStyle="label.03">
                {option.label}
              </styled.span>
              <styled.span display="block" textStyle="caption.02" color="ink.text-subdued">
                {formatSbtc(option.sbtc)}
              </styled.span>
            </styled.button>
          ))}
        </Flex>
      </Stack>
    </PopupFrame>
  );
}
