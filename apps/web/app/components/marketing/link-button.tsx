import { Link } from 'react-router';

import { cva } from 'leather-styles/css';
import { styled } from 'leather-styles/jsx';

const linkButtonStyles = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'space.02',
    borderRadius: 'round',
    textStyle: 'label.02',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s ease',
  },
  variants: {
    variant: {
      solid: {
        bg: 'ink.action-primary-default',
        color: 'ink.background-primary',
        _hover: { bg: 'ink.action-primary-hover' },
      },
      outline: {
        border: 'default',
        bg: 'ink.background-primary',
        color: 'ink.text-primary',
        _hover: { bg: 'ink.component-background-hover' },
      },
    },
    size: {
      sm: { height: '36px', px: 'space.04' },
      md: { height: '44px', px: 'space.05' },
    },
  },
  defaultVariants: { variant: 'solid', size: 'md' },
});

export const LinkButton = styled(Link, linkButtonStyles);

export const ExternalLinkButton = styled('a', linkButtonStyles);
