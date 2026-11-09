import { Flex, Stack, styled } from 'leather-styles/jsx';

import {
  type CompliancePlatform,
  complianceEmail,
  walletSets,
} from '../compliance-shared/compliance-content';
import { ExtensionFrame } from '../compliance-shared/compliance-frames';
import {
  DappApprovalScreen,
  LockoutScreen,
  MultisigReviewScreen,
  SendReviewScreen,
  WhyLockedScreen,
} from '../compliance-shared/compliance-screens';
import { ComplianceSection, PlatformBoard, Variant } from './compliance-board';
import { ComplianceCopyDeck } from './compliance-copy-deck';
import { MobileFrame } from './compliance-mobile-frames';

const sections = [
  { id: 'lockout', label: 'Lockout' },
  { id: 'why', label: 'Why Leather is locked' },
  { id: 'refusals', label: 'Refusals' },
  { id: 'screening', label: 'Screening in progress' },
  { id: 'no-answer', label: 'No answer' },
  { id: 'copy-deck', label: 'Copy deck' },
];

function openDisputeEmail(platform: CompliancePlatform) {
  window.location.assign(complianceEmail('dispute', platform).href);
}

function SectionNav() {
  return (
    <Flex
      position="sticky"
      top={0}
      zIndex={1}
      gap="space.02"
      flexWrap="wrap"
      py="space.03"
      bg="ink.background-primary"
      borderBottom="default"
    >
      {sections.map(section => (
        <styled.a
          key={section.id}
          href={`#${section.id}`}
          textStyle="label.02"
          px="space.03"
          py="space.02"
          borderRadius="round"
          _hover={{ bg: 'ink.component-background-hover' }}
        >
          {section.label}
        </styled.a>
      ))}
    </Flex>
  );
}

export function ComplianceUiPage() {
  return (
    <Stack gap="space.09" p="space.07" pb="space.11">
      <Stack gap="space.03" maxWidth="70ch">
        <styled.h1 textStyle="heading.03">Compliance screening gate</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Every screen the compliance gate adds to the extension and mobile, side by side, as a
          handoff board to build from. Copy and mock data come from the shared compliance module,
          the same one the walkthrough at /playground/compliance-states renders. Mobile frames are
          web approximations of the native screens.
        </styled.p>
      </Stack>

      <SectionNav />

      <ComplianceSection
        id="lockout"
        title="Lockout"
        description="When a wallet address is restricted the whole app locks: no balances, no transactions. Every surface shows the same screen, with the reason as the primary action and a prefilled dispute email as the secondary."
      >
        <PlatformBoard label="Extension">
          <Variant label="Popup">
            <ExtensionFrame kind="popup">
              <LockoutScreen onDispute={() => openDisputeEmail('extension')} />
            </ExtensionFrame>
          </Variant>
          <Variant label="Request window" note="Any dApp request opens to the lockout instead.">
            <ExtensionFrame kind="request">
              <LockoutScreen onDispute={() => openDisputeEmail('extension')} />
            </ExtensionFrame>
          </Variant>
          <Variant label="Full-page tab">
            <ExtensionFrame kind="tab">
              <LockoutScreen onDispute={() => openDisputeEmail('extension')} />
            </ExtensionFrame>
          </Variant>
        </PlatformBoard>
        <PlatformBoard label="Mobile">
          <Variant label="Full screen">
            <MobileFrame>
              <LockoutScreen onDispute={() => openDisputeEmail('mobile')} />
            </MobileFrame>
          </Variant>
        </PlatformBoard>
      </ComplianceSection>

      <ComplianceSection
        id="why"
        title="Why Leather is locked"
        description="The explanation behind the primary lockout action. Wallets created in Leather each get a link to back up their Secret Key; imported and Ledger wallets get none, because their keys already live elsewhere."
      >
        <PlatformBoard label="Extension">
          <Variant label="Created wallet" note="One backup link.">
            <ExtensionFrame kind="popup">
              <WhyLockedScreen wallets={walletSets.createdWallet} />
            </ExtensionFrame>
          </Variant>
          <Variant label="Imported wallet" note="No backup links.">
            <ExtensionFrame kind="popup">
              <WhyLockedScreen wallets={walletSets.importedWallet} />
            </ExtensionFrame>
          </Variant>
          <Variant
            label="Several wallets, including a Ledger"
            note="Wallets 1 and 3 created, Wallet 2 imported, plus a Ledger: links for Wallet 1 and Wallet 3 only."
          >
            <ExtensionFrame kind="popup">
              <WhyLockedScreen wallets={walletSets.severalWallets} />
            </ExtensionFrame>
          </Variant>
        </PlatformBoard>
        <PlatformBoard label="Mobile">
          <Variant label="Created wallet">
            <MobileFrame>
              <WhyLockedScreen wallets={walletSets.createdWallet} />
            </MobileFrame>
          </Variant>
          <Variant label="Imported wallet">
            <MobileFrame>
              <WhyLockedScreen wallets={walletSets.importedWallet} />
            </MobileFrame>
          </Variant>
          <Variant label="Several wallets, including a Ledger">
            <MobileFrame>
              <WhyLockedScreen wallets={walletSets.severalWallets} />
            </MobileFrame>
          </Variant>
        </PlatformBoard>
      </ComplianceSection>

      <ComplianceSection
        id="refusals"
        title="Refusals"
        description="When another party is restricted, the review stays readable but the primary action is replaced: a full-width Callout explains what happened and Close is the only way out."
      >
        <PlatformBoard label="Extension">
          <Variant label="Send review, flagged recipient">
            <ExtensionFrame kind="popup">
              <SendReviewScreen state="refused" />
            </ExtensionFrame>
          </Variant>
          <Variant label="Multisig, flagged member">
            <ExtensionFrame kind="popup">
              <MultisigReviewScreen state="refused" />
            </ExtensionFrame>
          </Variant>
          <Variant label="dApp approval, flagged counterparty" note="signPsbt">
            <ExtensionFrame kind="request">
              <DappApprovalScreen request="signPsbt" state="refused" />
            </ExtensionFrame>
          </Variant>
          <Variant label="dApp approval, flagged counterparty" note="Stacks contract call">
            <ExtensionFrame kind="request">
              <DappApprovalScreen request="contractCall" state="refused" />
            </ExtensionFrame>
          </Variant>
        </PlatformBoard>
        <PlatformBoard label="Mobile">
          <Variant label="Send review, flagged recipient">
            <MobileFrame>
              <SendReviewScreen state="refused" platform="mobile" />
            </MobileFrame>
          </Variant>
          <Variant label="Multisig, flagged member">
            <MobileFrame>
              <MultisigReviewScreen state="refused" platform="mobile" />
            </MobileFrame>
          </Variant>
          <Variant label="dApp approval, flagged counterparty">
            <MobileFrame>
              <DappApprovalScreen request="signPsbt" state="refused" platform="mobile" />
            </MobileFrame>
          </Variant>
        </PlatformBoard>
      </ComplianceSection>

      <ComplianceSection
        id="screening"
        title="Screening in progress"
        description="Until a verdict arrives the footer actions render the shimmering SkeletonLoader, as balances do on Home, so nothing can be confirmed early."
      >
        <PlatformBoard label="Extension">
          <Variant label="Send review">
            <ExtensionFrame kind="popup">
              <SendReviewScreen state="screening" />
            </ExtensionFrame>
          </Variant>
          <Variant label="dApp approval">
            <ExtensionFrame kind="request">
              <DappApprovalScreen request="contractCall" state="screening" />
            </ExtensionFrame>
          </Variant>
        </PlatformBoard>
        <PlatformBoard label="Mobile">
          <Variant label="Send review">
            <MobileFrame>
              <SendReviewScreen state="screening" platform="mobile" />
            </MobileFrame>
          </Variant>
        </PlatformBoard>
      </ComplianceSection>

      <ComplianceSection
        id="no-answer"
        title="No answer"
        description="When screening returns no verdict, a warning Callout replaces the actions with Try again, so nothing is signed without a verdict."
      >
        <PlatformBoard label="Extension">
          <Variant label="Send review">
            <ExtensionFrame kind="popup">
              <SendReviewScreen state="no-answer" />
            </ExtensionFrame>
          </Variant>
          <Variant label="dApp approval">
            <ExtensionFrame kind="request">
              <DappApprovalScreen request="signPsbt" state="no-answer" />
            </ExtensionFrame>
          </Variant>
        </PlatformBoard>
        <PlatformBoard label="Mobile">
          <Variant label="Send review">
            <MobileFrame>
              <SendReviewScreen state="no-answer" platform="mobile" />
            </MobileFrame>
          </Variant>
        </PlatformBoard>
      </ComplianceSection>

      <ComplianceSection
        id="copy-deck"
        title="Copy deck"
        description="Every string from the shared copy module, grouped by screen."
      >
        <ComplianceCopyDeck />
      </ComplianceSection>
    </Stack>
  );
}
