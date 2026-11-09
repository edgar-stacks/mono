import { Flex, styled } from 'leather-styles/jsx';
import { downloadLinks } from '~/content/marketing-content';

export function DownloadLinks() {
  return (
    <Flex gap="space.03" flexWrap="wrap">
      {downloadLinks.map(({ label, href, icon }) => (
        <styled.a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          display="inline-flex"
          alignItems="center"
          gap="space.02"
          px="space.04"
          height="48px"
          borderRadius="round"
          border="default"
          textStyle="label.02"
          bg="ink.background-primary"
          _hover={{ bg: 'ink.component-background-hover' }}
        >
          <styled.img src={icon} alt="" width="24px" height="24px" />
          {label}
        </styled.a>
      ))}
    </Flex>
  );
}
