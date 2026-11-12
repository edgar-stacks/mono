import { styled } from 'leather-styles/jsx';

interface LoadMoreButtonProps {
  onClick(): void;
}

export function LoadMoreButton({ onClick }: LoadMoreButtonProps) {
  return (
    <styled.button
      type="button"
      onClick={onClick}
      width="100%"
      py="space.03"
      bg="ink.background-secondary"
      textStyle="label.02"
      color="ink.text-subdued"
      _hover={{ bg: 'ink.component-background-hover', color: 'ink.text-primary' }}
    >
      Load More +
    </styled.button>
  );
}
