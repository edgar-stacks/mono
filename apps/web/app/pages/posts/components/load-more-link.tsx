import { Flex } from 'leather-styles/jsx';
import { LinkButton } from '~/components/marketing/link-button';

interface LoadMoreLinkProps {
  nextPage: number | null;
  query?: string;
}

export function LoadMoreLink({ nextPage, query }: LoadMoreLinkProps) {
  if (!nextPage) return null;

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('page', String(nextPage));

  return (
    <Flex justifyContent="center" mt="space.07">
      <LinkButton to={`?${params.toString()}`} preventScrollReset variant="outline">
        Load more +
      </LinkButton>
    </Flex>
  );
}
