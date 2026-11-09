import { type HTMLStyledProps, styled } from 'leather-styles/jsx';
import { useLeatherConnect } from '~/store/addresses';

export function InstallButton(props: HTMLStyledProps<'button'>) {
  const { setShowInstallLeatherDialog } = useLeatherConnect();

  return (
    <styled.button
      type="button"
      onClick={() => setShowInstallLeatherDialog(true)}
      display="inline-flex"
      alignItems="center"
      height="36px"
      px="space.04"
      borderRadius="round"
      border="default"
      textStyle="label.02"
      bg="ink.background-primary"
      _hover={{ bg: 'ink.component-background-hover' }}
      {...props}
    />
  );
}
