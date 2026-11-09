import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import {
  type CompliancePlatform,
  type ComplianceReview,
  type ComplianceWallet,
  complianceReviews,
  complianceWalletSets,
  createComplianceMailHref,
  mockDappOrigin,
} from '../compliance-shared/compliance-content';
import {
  ComplianceFrame,
  type ComplianceFrameKind,
  ComplianceVariant,
} from '../compliance-shared/compliance-frames';
import {
  type ComplianceGate,
  LockoutScreen,
  ReviewScreen,
  WhyLockedScreen,
} from '../compliance-shared/compliance-screens';
import { ComplianceBoard, ComplianceSection } from './compliance-board';
import { ComplianceCopyDeck } from './compliance-copy-deck';
import { MobileVariant } from './compliance-mobile-frames';

const sections = [
  { id: 'lockout', label: 'Lockout' },
  { id: 'why', label: 'Why Leather is locked' },
  { id: 'refusals', label: 'Refusals' },
  { id: 'screening', label: 'Screening in progress' },
  { id: 'no-answer', label: 'No answer' },
  { id: 'copy-deck', label: 'Copy deck' },
];

function openMail(href: string) {
  window.location.assign(href);
}

interface ExtensionVariantProps {
  label: string;
  note?: string;
  kind: ComplianceFrameKind;
  origin?: string;
  children: ReactNode;
}

function ExtensionVariant({ label, note, kind, origin, children }: ExtensionVariantProps) {
  return (
    <ComplianceVariant label={label} note={note}>
      <ComplianceFrame kind={kind} origin={origin}>
        {children}
      </ComplianceFrame>
    </ComplianceVariant>
  );
}

interface PlatformScreenProps {
  platform: CompliancePlatform;
}

function Lockout({ platform }: PlatformScreenProps) {
  return (
    <LockoutScreen onDispute={() => openMail(createComplianceMailHref('dispute', platform))} />
  );
}

interface GatedReviewProps extends PlatformScreenProps {
  review: ComplianceReview;
  gate: ComplianceGate;
}

function GatedReview({ platform, review, gate }: GatedReviewProps) {
  return (
    <ReviewScreen
      review={review}
      gate={gate}
      supportHref={createComplianceMailHref('support', platform)}
    />
  );
}

const whyVariants: { label: string; note: string; wallets: ComplianceWallet[] }[] = [
  {
    label: 'Created wallet',
    note: 'One backup link, for the wallet Leather generated.',
    wallets: complianceWalletSets.created,
  },
  {
    label: 'Imported wallet',
    note: 'No backup link: the Secret Key came from elsewhere.',
    wallets: complianceWalletSets.imported,
  },
  {
    label: 'Several wallets, with a Ledger',
    note: 'Wallets 1 and 3 created, Wallet 2 imported, plus a Ledger: two backup links.',
    wallets: complianceWalletSets.several,
  },
];

interface ReviewVariant {
  label: string;
  review: ComplianceReview;
}

const refusalVariants: ReviewVariant[] = [
  { label: 'Send review, flagged recipient', review: complianceReviews.send },
  { label: 'Multisig, flagged member', review: complianceReviews.multisig },
  { label: 'dApp approval, flagged counterparty', review: complianceReviews.psbt },
];

const pendingVariants: ReviewVariant[] = [
  { label: 'Send review', review: complianceReviews.send },
  { label: 'dApp approval', review: complianceReviews.contractCall },
];

function SectionNav() {
  return (
    <Flex
      as="nav"
      position="sticky"
      top="0"
      zIndex={1}
      gap="space.04"
      flexWrap="wrap"
      py="space.03"
      bg="ink.background-primary"
      borderBottomWidth={1}
      borderColor="ink.border-default"
    >
      {sections.map(section => (
        <styled.a key={section.id} href={`#${section.id}`} textStyle="label.03">
          {section.label}
        </styled.a>
      ))}
    </Flex>
  );
}

export function ComplianceUiPage() {
  return (
    <Stack gap="space.09" px="space.07" py="space.07" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Compliance screening gate</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Every screen the screening gate adds to the extension and mobile, as a handoff board. Mock
          data only; mobile frames are web approximations of the native screens. Copy and data come
          from the same module as the compliance-states walkthrough.
        </styled.p>
      </Stack>
      <SectionNav />

      <ComplianceSection
        id={sections[0].id}
        title={sections[0].label}
        description="The whole app locks when an address in any wallet is restricted, wherever Leather is open."
      >
        <ComplianceBoard platform="Extension">
          <ExtensionVariant label="Popup" kind="popup">
            <Lockout platform="extension" />
          </ExtensionVariant>
          <ExtensionVariant label="Request window" kind="request" origin={mockDappOrigin}>
            <Lockout platform="extension" />
          </ExtensionVariant>
          <ExtensionVariant label="Full-page tab" kind="full-page">
            <Lockout platform="extension" />
          </ExtensionVariant>
        </ComplianceBoard>
        <ComplianceBoard platform="Mobile">
          <MobileVariant label="Full screen">
            <Lockout platform="mobile" />
          </MobileVariant>
        </ComplianceBoard>
      </ComplianceSection>

      <ComplianceSection
        id={sections[1].id}
        title={sections[1].label}
        description="One backup link per wallet created in Leather. Imported and Ledger wallets get none."
      >
        <ComplianceBoard platform="Extension">
          {whyVariants.map(variant => (
            <ExtensionVariant
              key={variant.label}
              label={variant.label}
              note={variant.note}
              kind="popup"
            >
              <WhyLockedScreen wallets={variant.wallets} />
            </ExtensionVariant>
          ))}
        </ComplianceBoard>
        <ComplianceBoard platform="Mobile">
          {whyVariants.map(variant => (
            <MobileVariant key={variant.label} label={variant.label} note={variant.note}>
              <WhyLockedScreen wallets={variant.wallets} />
            </MobileVariant>
          ))}
        </ComplianceBoard>
      </ComplianceSection>

      <ComplianceSection
        id={sections[2].id}
        title={sections[2].label}
        description="A full-width callout explains the refusal and Close replaces the primary action."
      >
        <ComplianceBoard platform="Extension">
          {refusalVariants.map(variant => (
            <ExtensionVariant
              key={variant.label}
              label={variant.label}
              kind={variant.review.origin ? 'request' : 'popup'}
              origin={variant.review.origin}
            >
              <GatedReview platform="extension" review={variant.review} gate="flagged" />
            </ExtensionVariant>
          ))}
        </ComplianceBoard>
        <ComplianceBoard platform="Mobile">
          {refusalVariants.map(variant => (
            <MobileVariant key={variant.label} label={variant.label}>
              <GatedReview platform="mobile" review={variant.review} gate="flagged" />
            </MobileVariant>
          ))}
        </ComplianceBoard>
      </ComplianceSection>

      <ComplianceSection
        id={sections[3].id}
        title={sections[3].label}
        description="Footer actions shimmer, as balances do on Home, until a verdict arrives."
      >
        <ComplianceBoard platform="Extension">
          {pendingVariants.map(variant => (
            <ExtensionVariant
              key={variant.label}
              label={variant.label}
              kind={variant.review.origin ? 'request' : 'popup'}
              origin={variant.review.origin}
            >
              <GatedReview platform="extension" review={variant.review} gate="screening" />
            </ExtensionVariant>
          ))}
        </ComplianceBoard>
        <ComplianceBoard platform="Mobile">
          {pendingVariants.map(variant => (
            <MobileVariant key={variant.label} label={variant.label}>
              <GatedReview platform="mobile" review={variant.review} gate="screening" />
            </MobileVariant>
          ))}
        </ComplianceBoard>
      </ComplianceSection>

      <ComplianceSection
        id={sections[4].id}
        title={sections[4].label}
        description="Without a verdict nothing is signed: a warning callout offers Try again and a support email."
      >
        <ComplianceBoard platform="Extension">
          {pendingVariants.map(variant => (
            <ExtensionVariant
              key={variant.label}
              label={variant.label}
              kind={variant.review.origin ? 'request' : 'popup'}
              origin={variant.review.origin}
            >
              <GatedReview platform="extension" review={variant.review} gate="no-answer" />
            </ExtensionVariant>
          ))}
        </ComplianceBoard>
        <ComplianceBoard platform="Mobile">
          {pendingVariants.map(variant => (
            <MobileVariant key={variant.label} label={variant.label}>
              <GatedReview platform="mobile" review={variant.review} gate="no-answer" />
            </MobileVariant>
          ))}
        </ComplianceBoard>
      </ComplianceSection>

      <ComplianceSection
        id={sections[5].id}
        title={sections[5].label}
        description="Every string from the shared copy module, grouped by screen. Wallet names use Wallet 1."
      >
        <ComplianceCopyDeck />
      </ComplianceSection>
    </Stack>
  );
}
