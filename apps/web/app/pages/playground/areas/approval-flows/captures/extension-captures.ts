import connectFirst from './connect-first.png';
import genericCall from './generic-call.png';
import messageBip322 from './message-bip322.png';
import messagePlain from './message-plain.png';
import psbtSignOnly from './psbt-sign-only.png';

interface ExtensionCapture {
  src: string;
  caption: string;
}

const connect = { src: connectFirst, caption: 'Current extension: connect app' };
const contractCall = {
  src: genericCall,
  caption: 'Current extension: contract call without post-conditions',
};

const extensionCaptures: Record<string, ExtensionCapture> = {
  'connect-first': connect,
  'connect-ledger': connect,
  'message-plain': { src: messagePlain, caption: 'Current extension: Stacks message signing' },
  'message-bip322': { src: messageBip322, caption: 'Current extension: Bitcoin message signing' },
  'psbt-sign-only': { src: psbtSignOnly, caption: 'Current extension: PSBT approval' },
  'generic-mint': contractCall,
  'generic-vote': contractCall,
  'generic-router': contractCall,
};

export function extensionCaptureFor(screenId: string): ExtensionCapture | null {
  return extensionCaptures[screenId] ?? null;
}
