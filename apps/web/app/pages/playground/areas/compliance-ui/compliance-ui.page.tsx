import { Box, Stack, styled } from 'leather-styles/jsx';

import {
  type ComplianceVerdict,
  type MailContext,
  createDisputeDraft,
  createSupportDraft,
  mockMailContexts,
  mockWallets,
  openMailDraft,
} from '../compliance-shared/compliance-content';
import {
  FullPageTabFrame,
  PopupFrame,
  RequestWindowFrame,
} from '../compliance-shared/compliance-frames';
import {
  ApprovalScreen,
  LockoutScreen,
  MultisigReviewScreen,
  SendReviewScreen,
  WhyLockedScreen,
} from '../compliance-shared/compliance-screens';
import { BoardSection, BoardVariant, PlatformBoard } from './compliance-board';
import { ComplianceCopyDeck } from './compliance-copy-deck';
import { PhoneFrame } from './compliance-mobile-frames';

const sections = [
  { id: 'lockout', label: 'Lockout' },
  { id: 'why', label: 'Why Leather is locked' },
  { id: 'refusals', label: 'Refusals' },
  { id: 'screening', label: 'Screening in progress' },
  { id: 'no-answer', label: 'No answer' },
  { id: 'copy-deck', label: 'Copy deck' },
];

function disputeFrom(context: MailContext) {
  return () => openMailDraft(createDisputeDraft(context));
}

function supportFrom(context: MailContext) {
  return () => openMailDraft(createSupportDraft(context));
}

const whyVariants = [
  {
    label: 'Created wallet',
    note: 'One backup link for the wallet created in Leather.',
    wallets: mockWallets.created,
  },
  {
    label: 'Imported wallet',
    note: 'No backup link: the Secret Key came from elsewhere.',
    wallets: mockWallets.imported,
  },
  {
    label: 'Several wallets, including a Ledger',
    note: 'Wallets 1 and 3 created, Wallet 2 imported, a Ledger: links for Wallet 1 and Wallet 3 only.',
    wallets: mockWallets.several,
  },
];

interface GatedVariantsProps {
  verdict: ComplianceVerdict;
  mobile?: boolean;
}

function GatedVariants({ verdict, mobile }: GatedVariantsProps) {
  const context = mobile ? mockMailContexts.mobile : mockMailContexts.extension;
  const Frame = mobile ? PhoneFrame : PopupFrame;
  const RequestFrame = mobile ? PhoneFrame : RequestWindowFrame;
  const onContactSupport = supportFrom(context);

  return (
    <>
      <BoardVariant label="Send review" note="A 0.05 BTC send from Account 1.">
        <Frame>
          <SendReviewScreen verdict={verdict} onContactSupport={onContactSupport} />
        </Frame>
      </BoardVariant>
      <BoardVariant label="Multisig review" note="A 2-of-3 multisig proposal.">
        <Frame>
          <MultisigReviewScreen verdict={verdict} onContactSupport={onContactSupport} />
        </Frame>
      </BoardVariant>
      <BoardVariant label="dApp approval, signPsbt" note="Requested by https://dapp.example.">
        <RequestFrame>
          <ApprovalScreen kind="signPsbt" verdict={verdict} onContactSupport={onContactSupport} />
        </RequestFrame>
      </BoardVariant>
      <BoardVariant label="dApp approval, contract call" note="A Stacks contract call.">
        <RequestFrame>
          <ApprovalScreen
            kind="contractCall"
            verdict={verdict}
            onContactSupport={onContactSupport}
          />
        </RequestFrame>
      </BoardVariant>
    </>
  );
}

export function ComplianceUiPage() {
  const extensionDispute = disputeFrom(mockMailContexts.extension);
  const mobileDispute = disputeFrom(mockMailContexts.mobile);

  return (
    <Stack gap="space.09" px="space.07" pb="space.11">
      <Stack gap="space.03" pt="space.07" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Compliance screening gate</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Every screen the screening gate adds to the extension and mobile, in the states that
          change the design. Mock data only. Mobile frames are web approximations of the native
          screens.
        </styled.p>
      </Stack>
      <styled.nav
        display="flex"
        position="sticky"
        top={0}
        zIndex={10}
        gap="space.04"
        flexWrap="wrap"
        py="space.03"
        bg="ink.background-primary"
        borderBottomWidth={1}
        borderColor="ink.border-default"
      >
        {sections.map(section => (
          <styled.a
            key={section.id}
            href={`#${section.id}`}
            textStyle="label.02"
            color="ink.text-primary"
            _hover={{ textDecoration: 'underline' }}
          >
            {section.label}
          </styled.a>
        ))}
      </styled.nav>

      <BoardSection
        id="lockout"
        title="Lockout"
        description="The whole app is locked once an address in any wallet is restricted. Every surface shows the same screen; Dispute this opens a prefilled email."
      >
        <PlatformBoard platform="Extension">
          <BoardVariant label="Popup">
            <PopupFrame>
              <LockoutScreen onDispute={extensionDispute} />
            </PopupFrame>
          </BoardVariant>
          <BoardVariant label="Request window" note="A dApp request opens the lockout too.">
            <RequestWindowFrame>
              <LockoutScreen onDispute={extensionDispute} />
            </RequestWindowFrame>
          </BoardVariant>
          <BoardVariant label="Full-page tab">
            <FullPageTabFrame>
              <LockoutScreen onDispute={extensionDispute} />
            </FullPageTabFrame>
          </BoardVariant>
        </PlatformBoard>
        <PlatformBoard platform="Mobile">
          <BoardVariant label="Full screen">
            <PhoneFrame>
              <LockoutScreen onDispute={mobileDispute} />
            </PhoneFrame>
          </BoardVariant>
        </PlatformBoard>
      </BoardSection>

      <BoardSection
        id="why"
        title="Why Leather is locked"
        description="One backup link per wallet created in Leather. Imported and Ledger wallets get none."
      >
        <PlatformBoard platform="Extension">
          {whyVariants.map(variant => (
            <BoardVariant key={variant.label} label={variant.label} note={variant.note}>
              <PopupFrame>
                <WhyLockedScreen wallets={variant.wallets} />
              </PopupFrame>
            </BoardVariant>
          ))}
        </PlatformBoard>
        <PlatformBoard platform="Mobile">
          {whyVariants.map(variant => (
            <BoardVariant key={variant.label} label={variant.label} note={variant.note}>
              <PhoneFrame>
                <WhyLockedScreen wallets={variant.wallets} />
              </PhoneFrame>
            </BoardVariant>
          ))}
        </PlatformBoard>
      </BoardSection>

      <BoardSection
        id="refusals"
        title="Refusals"
        description="A flagged recipient, multisig member or dApp counterparty. A full-width callout explains, and Close replaces the primary action."
      >
        <PlatformBoard platform="Extension">
          <GatedVariants verdict="flagged" />
        </PlatformBoard>
        <PlatformBoard platform="Mobile">
          <GatedVariants verdict="flagged" mobile />
        </PlatformBoard>
      </BoardSection>

      <BoardSection
        id="screening"
        title="Screening in progress"
        description="Footer actions shimmer, as on Home, until a verdict arrives."
      >
        <PlatformBoard platform="Extension">
          <GatedVariants verdict="screening" />
        </PlatformBoard>
        <PlatformBoard platform="Mobile">
          <GatedVariants verdict="screening" mobile />
        </PlatformBoard>
      </BoardSection>

      <BoardSection
        id="no-answer"
        title="No answer"
        description="Screening did not answer. A warning callout and Try again, so nothing is signed without a verdict."
      >
        <PlatformBoard platform="Extension">
          <GatedVariants verdict="no-answer" />
        </PlatformBoard>
        <PlatformBoard platform="Mobile">
          <GatedVariants verdict="no-answer" mobile />
        </PlatformBoard>
      </BoardSection>

      <BoardSection
        id="copy-deck"
        title="Copy deck"
        description="Every string from the shared copy module, grouped by screen."
      >
        <Box maxWidth="960px">
          <ComplianceCopyDeck />
        </Box>
      </BoardSection>
    </Stack>
  );
}
