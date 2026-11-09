import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type IconProps } from '../../icons/icon/create-icon.web';
import { InlineIcon } from './inline-icon.web';

function TestIcon({ variant, color }: IconProps) {
  return <svg data-variant={variant} data-color={color} />;
}

describe('InlineIcon', () => {
  it('sizes the icon from the size prop', () => {
    const { container } = render(<InlineIcon icon={<TestIcon />} size="medium" />);
    expect(container.querySelector('svg')?.getAttribute('data-variant')).toBe('medium');
  });

  it('colours the icon from the tone', () => {
    const { container } = render(<InlineIcon icon={<TestIcon />} tone="subdued" />);
    expect(container.querySelector('svg')?.getAttribute('data-color')).toBe('ink.text-subdued');
  });

  it('inherits the text colour by default', () => {
    const { container } = render(<InlineIcon icon={<TestIcon />} />);
    expect(container.querySelector('svg')?.getAttribute('data-color')).toBe('current');
  });

  it('marks its placement and hides itself from assistive tech', () => {
    const { container } = render(<InlineIcon icon={<TestIcon />} placement="end" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute('data-placement')).toBe('end');
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
  });
});
