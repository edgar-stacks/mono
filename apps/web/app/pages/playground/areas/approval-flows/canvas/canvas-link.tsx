import { Link } from 'react-router';

import { styled } from 'leather-styles/jsx';

export const CanvasLink = styled(Link, {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    px: 'space.03',
    borderRadius: 'round',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'ink.border-default',
    textStyle: 'label.02',
    color: 'ink.action-primary-default',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    _hover: { bg: 'ink.component-background-hover' },
    _focusVisible: { outline: '3px solid {colors.blue.border}' },
  },
});
