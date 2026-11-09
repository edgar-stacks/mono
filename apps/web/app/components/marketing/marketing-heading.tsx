import { type HTMLStyledProps, styled } from 'leather-styles/jsx';

export function MarketingHeading(props: HTMLStyledProps<'h2'>) {
  return <styled.h2 textStyle={['heading.03', null, 'heading.02']} {...props} />;
}
