import connect from './connect.png';
import contractCallAllow from './contract-call-allow.png';
import contractCall from './contract-call.png';
import sendBtc from './send-btc.png';
import signMessage from './sign-message.png';
import signPsbt from './sign-psbt.png';
import signStructuredMessage from './sign-structured-message.png';
import stxTransfer from './stx-transfer.png';

interface CurrentCapture {
  src: string;
  caption: string;
}

const currentCaptures: Record<string, CurrentCapture> = {
  connect: { src: connect, caption: 'getAddresses' },
  'sign-message': { src: signMessage, caption: 'stx_signMessage, plain text' },
  'sign-structured-message': { src: signStructuredMessage, caption: 'stx_signMessage, structured' },
  'send-btc': { src: sendBtc, caption: 'sendTransfer' },
  'stx-transfer': { src: stxTransfer, caption: 'stx_transferStx' },
  'sign-psbt': { src: signPsbt, caption: 'signPsbt' },
  'contract-call': { src: contractCall, caption: 'stx_callContract, deny mode' },
  'contract-call-allow': { src: contractCallAllow, caption: 'stx_callContract, allow mode' },
};

export function captureFor(id: string | undefined): CurrentCapture | undefined {
  return id ? currentCaptures[id] : undefined;
}
