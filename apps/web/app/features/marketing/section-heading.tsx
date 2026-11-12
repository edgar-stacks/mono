import { type HTMLStyledProps, styled } from 'leather-styles/jsx';

export function MarketingHeading(props: HTMLStyledProps<'h2'>) {
  return (
    <styled.h2
      textStyle="heading.03"
      fontSize={['1.75rem', null, '2rem']}
      whiteSpace="pre-line"
      {...props}
    />
  );
}

export function MarketingSection(props: HTMLStyledProps<'section'>) {
  return <styled.section mt={['space.09', null, '120px']} {...props} />;
}
