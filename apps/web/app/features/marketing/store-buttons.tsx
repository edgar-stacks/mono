import { Flex, styled } from 'leather-styles/jsx';

import { marketingLinks } from './marketing-links';

interface StoreButton {
  label: string;
  href: string;
  icon: string;
}

const storeButtons: StoreButton[] = [
  { label: 'Chrome', href: marketingLinks.chromeStore, icon: '/marketing/stores/chrome.png' },
  { label: 'iOS', href: marketingLinks.appStore, icon: '/marketing/stores/app-store.png' },
  {
    label: 'Android',
    href: marketingLinks.googlePlay,
    icon: '/marketing/stores/google-play.png',
  },
];

export function StoreButtons() {
  return (
    <Flex gap="space.03" flexWrap="wrap">
      {storeButtons.map(({ label, href, icon }) => (
        <styled.a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          display="inline-flex"
          alignItems="center"
          gap="space.03"
          height="48px"
          px="space.04"
          border="default"
          borderRadius="999px"
          textStyle="label.02"
          bg="ink.background-primary"
          transition="background 0.2s ease"
          _hover={{ bg: 'ink.component-background-hover' }}
        >
          <styled.img src={icon} alt="" width="24px" height="24px" objectFit="contain" />
          {label}
        </styled.a>
      ))}
    </Flex>
  );
}
