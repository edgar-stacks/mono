import { type ReactNode, useState } from 'react';

import { Flex, HStack, Stack, styled } from 'leather-styles/jsx';

import { Badge, Button, Callout } from '@leather.io/ui';

type FeeTier = 'low' | 'standard' | 'high';

const feeTiers: FeeTier[] = ['low', 'standard', 'high'];

const feeTierLabels: Record<FeeTier, string> = {
  low: 'Low',
  standard: 'Standard',
  high: 'High',
};

const sbtcFeeSatsByTier: Record<FeeTier, number> = {
  low: 210,
  standard: 420,
  high: 945,
};

const satsPerBtc = 100_000_000;
const sendAmountSats = 250_000;
const sampleRecipient = 'SP2J6ZY…V9EJ7';
const sampleContract = 'SP3K8BC…KBR9.amm-pool-v2-01';
const sampleMemo = 'Invoice 42';

function formatSbtc(sats: number) {
  return `${(sats / satsPerBtc).toFixed(8)} sBTC`;
}

interface PopupFrameProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}
function PopupFrame({ title, children, footer }: PopupFrameProps) {
  return (
    <Stack
      bg="ink.background-primary"
      border="default"
      borderRadius="md"
      gap="space.05"
      minHeight="520px"
      p="space.05"
      width="360px"
    >
      <styled.h2 textStyle="heading.05">{title}</styled.h2>
      <Stack flex="1" gap="space.04">
        {children}
      </Stack>
      {footer}
    </Stack>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
}
function DetailRow({ label, value }: DetailRowProps) {
  return (
    <HStack justifyContent="space-between" textStyle="label.02">
      <styled.span color="ink.text-subdued">{label}</styled.span>
      <styled.span textAlign="right">{value}</styled.span>
    </HStack>
  );
}

interface StepTrailProps {
  steps: string[];
  current: number;
}
function StepTrail({ steps, current }: StepTrailProps) {
  return (
    <HStack flexWrap="wrap" gap="space.02">
      {steps.map((step, index) => (
        <Badge key={step} label={step} variant={index === current ? 'info' : 'default'} />
      ))}
    </HStack>
  );
}

interface FlowBoardProps {
  title: string;
  note: string;
  trail: ReactNode;
  children: ReactNode;
}
function FlowBoard({ title, note, trail, children }: FlowBoardProps) {
  return (
    <Stack gap="space.04" maxWidth="760px">
      <Stack gap="space.02">
        <styled.h2 textStyle="heading.04">{title}</styled.h2>
        <styled.p color="ink.text-subdued" textStyle="body.02">
          {note}
        </styled.p>
      </Stack>
      {trail}
      {children}
    </Stack>
  );
}

type SponsoredSendStep = 'form' | 'review' | 'sent';

const sponsoredSendSteps: SponsoredSendStep[] = ['form', 'review', 'sent'];
const sponsoredSendStepLabels = ['Send form', 'Review', 'Sent'];

function SponsoredSendFlow() {
  const [step, setStep] = useState<SponsoredSendStep>('form');
  const [tier, setTier] = useState<FeeTier>('standard');
  const [isQuoteExpired, setIsQuoteExpired] = useState(false);
  const [showRequoteCallout, setShowRequoteCallout] = useState(false);
  const feeSats = sbtcFeeSatsByTier[tier];
  const totalSats = sendAmountSats + feeSats;

  function confirm() {
    if (isQuoteExpired) {
      setIsQuoteExpired(false);
      setShowRequoteCallout(true);
      return;
    }
    setStep('sent');
  }

  function restart() {
    setStep('form');
    setShowRequoteCallout(false);
  }

  return (
    <FlowBoard
      title="Send sBTC with the fee paid in sBTC"
      note="The account holds sBTC but less STX than the lowest fee estimate. The fee row converts each STX tier at the quote's rate and the Leather sponsor pays the STX fee; the user pays the sBTC fee inside the same transfer-many call. Toggle the expired quote to see the re-quote on confirm."
      trail={
        <StepTrail steps={sponsoredSendStepLabels} current={sponsoredSendSteps.indexOf(step)} />
      }
    >
      {step === 'form' && (
        <PopupFrame
          title="Send sBTC"
          footer={
            <Button fullWidth onClick={() => setStep('review')}>
              Continue
            </Button>
          }
        >
          <DetailRow label="Amount" value={formatSbtc(sendAmountSats)} />
          <DetailRow label="To" value={sampleRecipient} />
          <DetailRow label="Memo" value={sampleMemo} />
          <Stack gap="space.02">
            <HStack gap="space.02">
              <styled.span color="ink.text-subdued" textStyle="label.02">
                Fee
              </styled.span>
              <Badge label="Sponsored" variant="info" />
            </HStack>
            <HStack gap="space.02">
              {feeTiers.map(feeTier => (
                <Button
                  key={feeTier}
                  size="sm"
                  variant={feeTier === tier ? 'solid' : 'outline'}
                  onClick={() => setTier(feeTier)}
                >
                  {feeTierLabels[feeTier]}
                </Button>
              ))}
            </HStack>
            <styled.span textStyle="label.02">{formatSbtc(feeSats)}</styled.span>
          </Stack>
          <DetailRow label="Available after fee" value={formatSbtc(50_000_000 - feeSats)} />
        </PopupFrame>
      )}

      {step === 'review' && (
        <PopupFrame
          title="Review"
          footer={
            <Stack gap="space.02">
              <Button fullWidth onClick={confirm}>
                Confirm and send transaction
              </Button>
              <Button fullWidth variant="ghost" onClick={() => setIsQuoteExpired(true)}>
                Simulate an expired quote
              </Button>
            </Stack>
          }
        >
          {showRequoteCallout && (
            <Callout title="Fee quote updated" variant="warning">
              The previous fee quote expired. Review the updated sBTC fee and confirm again
            </Callout>
          )}
          <DetailRow label="To" value={sampleRecipient} />
          <DetailRow label="Total spend" value={formatSbtc(totalSats)} />
          <DetailRow label="Sending" value={formatSbtc(sendAmountSats)} />
          <DetailRow label="Fee" value={formatSbtc(feeSats)} />
          <DetailRow label="Memo" value={sampleMemo} />
          {isQuoteExpired && (
            <styled.p color="ink.text-subdued" textStyle="caption.01">
              The quote has expired: confirming fetches a new quote and a fresh nonce instead of
              submitting.
            </styled.p>
          )}
        </PopupFrame>
      )}

      {step === 'sent' && (
        <PopupFrame
          title="Sent"
          footer={
            <Button fullWidth variant="outline" onClick={restart}>
              Start again
            </Button>
          }
        >
          <DetailRow label="Status" value="In mempool" />
          <DetailRow label="Total spend" value={formatSbtc(totalSats)} />
          <DetailRow label="Sending" value={formatSbtc(sendAmountSats)} />
          <DetailRow label="Fee" value={formatSbtc(feeSats)} />
          <DetailRow label="Memo" value={sampleMemo} />
          <styled.p color="ink.text-subdued" textStyle="caption.01">
            Submitted to the sponsor, which co-signs and broadcasts. The wallet never broadcasts a
            sponsored transaction itself.
          </styled.p>
        </PopupFrame>
      )}
    </FlowBoard>
  );
}

type BundleStep = 'request' | 'fee' | 'review' | 'submitted';

const bundleSteps: BundleStep[] = ['request', 'fee', 'review', 'submitted'];
const bundleStepLabels = ['App request', 'sBTC fee', 'Review bundle', 'Submitted'];
const bundleFeeSats = 1_150;

function ContractCallBundleFlow() {
  const [step, setStep] = useState<BundleStep>('request');

  return (
    <FlowBoard
      title="Planned: sponsor any contract call with a two-transaction bundle"
      note="Exploration only. An app asks the wallet to sign a contract call while the account has no STX. The wallet pairs it with a separate sBTC fee transfer to the sponsor; both are signed together and submitted as one bundle, so the sponsor only pays the STX fee once the sBTC fee lands."
      trail={<StepTrail steps={bundleStepLabels} current={bundleSteps.indexOf(step)} />}
    >
      {step === 'request' && (
        <PopupFrame
          title="Contract call"
          footer={
            <Button fullWidth onClick={() => setStep('fee')}>
              Pay fee in sBTC
            </Button>
          }
        >
          <DetailRow label="App" value="app.example.com" />
          <DetailRow label="Contract" value={sampleContract} />
          <DetailRow label="Function" value="swap-x-for-y" />
          <Callout title="Not enough STX for the fee" variant="info">
            The sponsor can pay the STX fee if you pay it back in sBTC
          </Callout>
        </PopupFrame>
      )}

      {step === 'fee' && (
        <PopupFrame
          title="sBTC fee"
          footer={
            <Button fullWidth onClick={() => setStep('review')}>
              Continue
            </Button>
          }
        >
          <DetailRow label="Transaction 1" value="sBTC fee transfer" />
          <DetailRow label="Fee" value={formatSbtc(bundleFeeSats)} />
          <DetailRow label="To" value="Leather sponsor" />
          <DetailRow label="Transaction 2" value="Contract call, sponsored" />
        </PopupFrame>
      )}

      {step === 'review' && (
        <PopupFrame
          title="Review bundle"
          footer={
            <Button fullWidth onClick={() => setStep('submitted')}>
              Sign both and submit
            </Button>
          }
        >
          <Flex direction="column" gap="space.03">
            <Badge label="1 · sBTC fee transfer" />
            <DetailRow label="Sends" value={formatSbtc(bundleFeeSats)} />
            <Badge label="2 · Contract call" />
            <DetailRow label="Calls" value={`${sampleContract}::swap-x-for-y`} />
            <DetailRow label="STX fee" value="Paid by the sponsor" />
          </Flex>
        </PopupFrame>
      )}

      {step === 'submitted' && (
        <PopupFrame
          title="Submitted"
          footer={
            <Button fullWidth variant="outline" onClick={() => setStep('request')}>
              Start again
            </Button>
          }
        >
          <DetailRow label="Bundle" value="2 transactions" />
          <DetailRow label="Status" value="Waiting for the sponsor" />
          <styled.p color="ink.text-subdued" textStyle="caption.01">
            Open questions: ordering guarantees between the two transactions and what the user sees
            if only the fee transfer confirms.
          </styled.p>
        </PopupFrame>
      )}
    </FlowBoard>
  );
}

export function SbtcSponsorshipFlowsPage() {
  return (
    <Stack gap="space.09" p="space.07">
      <Stack gap="space.02">
        <styled.h1 textStyle="heading.03">sBTC sponsored fees</styled.h1>
        <styled.p color="ink.text-subdued" maxWidth="760px" textStyle="body.02">
          Click-through mocks for paying Stacks fees in sBTC through the Leather sponsorship API.
          Everything here is dummy data and makes no requests.
        </styled.p>
      </Stack>
      <SponsoredSendFlow />
      <ContractCallBundleFlow />
    </Stack>
  );
}
