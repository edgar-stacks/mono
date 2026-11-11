import { copyToClipboard } from '@app/common/utils/copy-to-clipboard';
import { useToast } from '@app/features/toasts/use-toast';

export function useCopyTransactionId() {
  const toast = useToast();
  return (txid: string) => {
    void copyToClipboard(txid);
    toast.success('Transaction ID copied to clipboard');
  };
}
