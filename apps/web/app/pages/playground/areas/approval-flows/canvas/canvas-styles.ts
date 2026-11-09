import { css } from 'leather-styles/css';

export const canvasButton = css({
  display: 'inline-block',
  textStyle: 'label.03',
  px: 'space.03',
  py: 'space.02',
  borderRadius: 'round',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'ink.border-default',
  bg: 'ink.background-primary',
  color: 'ink.text-primary',
  textDecoration: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  _hover: { bg: 'ink.component-background-hover' },
  _disabled: { opacity: 0.4, cursor: 'not-allowed' },
});

export const canvasSelect = css({
  textStyle: 'label.03',
  px: 'space.02',
  py: 'space.02',
  borderRadius: 'sm',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'ink.border-default',
  bg: 'ink.background-primary',
  color: 'ink.text-primary',
  maxWidth: '100%',
});
