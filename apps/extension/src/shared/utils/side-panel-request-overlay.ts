import { z } from 'zod/mini';

import { RouteUrls } from '@shared/route-urls';

const sidePanelRequestCategorySchema = z.enum([
  'connection',
  'signature',
  'transaction',
  'generic',
]);
export type SidePanelRequestCategory = z.infer<typeof sidePanelRequestCategorySchema>;

const sidePanelOverlayVariantSchema = z.enum(['pending', 'action-required']);
export type SidePanelOverlayVariant = z.infer<typeof sidePanelOverlayVariantSchema>;

const overlayMessageSource = 'leather-side-panel-overlay';

const showOverlayMessageSchema = z.object({
  source: z.literal(overlayMessageSource),
  type: z.literal('show'),
  category: sidePanelRequestCategorySchema,
  variant: sidePanelOverlayVariantSchema,
});
export type SidePanelOverlayShowMessage = z.infer<typeof showOverlayMessageSchema>;

const hideOverlayMessageSchema = z.object({
  source: z.literal(overlayMessageSource),
  type: z.literal('hide'),
});
type SidePanelOverlayHideMessage = z.infer<typeof hideOverlayMessageSchema>;

const openPanelMessageSchema = z.object({
  source: z.literal(overlayMessageSource),
  type: z.literal('open-panel'),
});
type SidePanelOverlayOpenPanelMessage = z.infer<typeof openPanelMessageSchema>;

const dismissMessageSchema = z.object({
  source: z.literal(overlayMessageSource),
  type: z.literal('dismiss'),
});
type SidePanelOverlayDismissMessage = z.infer<typeof dismissMessageSchema>;

export function createSidePanelOverlayShowMessage(
  category: SidePanelRequestCategory,
  variant: SidePanelOverlayVariant
): SidePanelOverlayShowMessage {
  return { source: overlayMessageSource, type: 'show', category, variant };
}

export function createSidePanelOverlayHideMessage(): SidePanelOverlayHideMessage {
  return { source: overlayMessageSource, type: 'hide' };
}

export function createSidePanelOverlayOpenPanelMessage(): SidePanelOverlayOpenPanelMessage {
  return { source: overlayMessageSource, type: 'open-panel' };
}

export function createSidePanelOverlayDismissMessage(): SidePanelOverlayDismissMessage {
  return { source: overlayMessageSource, type: 'dismiss' };
}

export function parseSidePanelOverlayShowMessage(message: unknown) {
  const result = showOverlayMessageSchema.safeParse(message);
  return result.success ? result.data : null;
}

export function isSidePanelOverlayHideMessage(message: unknown) {
  return hideOverlayMessageSchema.safeParse(message).success;
}

export function isSidePanelOverlayOpenPanelMessage(message: unknown) {
  return openPanelMessageSchema.safeParse(message).success;
}

export function isSidePanelOverlayDismissMessage(message: unknown) {
  return dismissMessageSchema.safeParse(message).success;
}

const connectionRoutes: string[] = [
  RouteUrls.RpcGetAddresses,
  RouteUrls.RpcBtcAddAccount,
  RouteUrls.RpcStxAddAccount,
];

const signatureRoutes: string[] = [
  RouteUrls.RpcSignPsbt,
  RouteUrls.RpcSignBip322Message,
  RouteUrls.RpcStacksSignature,
];

const transactionRoutes: string[] = [
  RouteUrls.RpcSendTransfer,
  RouteUrls.RpcStxSignTransaction,
  RouteUrls.RpcStxCallContract,
  RouteUrls.RpcStxDeployContract,
  RouteUrls.RpcStxTransferStx,
  RouteUrls.RpcStxTransferSip9Nft,
  RouteUrls.RpcStxTransferSip10Ft,
];

export function getSidePanelRequestCategory(route: string): SidePanelRequestCategory {
  if (connectionRoutes.includes(route)) return 'connection';
  if (signatureRoutes.includes(route)) return 'signature';
  if (transactionRoutes.includes(route)) return 'transaction';
  return 'generic';
}

interface SidePanelOverlayCopy {
  title: string;
  description: string;
  callToAction?: string;
}

const pendingCopy: Record<SidePanelRequestCategory, SidePanelOverlayCopy> = {
  connection: {
    title: 'Review connection in Leather',
    description: 'Approve or cancel this connection request in the Leather side panel.',
  },
  signature: {
    title: 'Review signature in Leather',
    description: 'Check the details and sign or cancel in the Leather side panel.',
  },
  transaction: {
    title: 'Review transaction in Leather',
    description: 'Check the details and confirm or cancel in the Leather side panel.',
  },
  generic: {
    title: 'Review in Leather',
    description: 'Continue this request in the Leather side panel.',
  },
};

const actionRequiredCopy: Record<SidePanelRequestCategory, SidePanelOverlayCopy> = {
  connection: {
    title: 'Connection request waiting',
    description: 'Open Leather to approve or cancel this connection request.',
    callToAction: 'Open Leather',
  },
  signature: {
    title: 'Signature request waiting',
    description: 'Open Leather to review and sign or cancel this request.',
    callToAction: 'Open Leather',
  },
  transaction: {
    title: 'Transaction request waiting',
    description: 'Open Leather to review and confirm or cancel this transaction.',
    callToAction: 'Open Leather',
  },
  generic: {
    title: 'Request waiting in Leather',
    description: 'Open Leather to continue this request.',
    callToAction: 'Open Leather',
  },
};

export function getSidePanelOverlayCopy(
  category: SidePanelRequestCategory,
  variant: SidePanelOverlayVariant
): SidePanelOverlayCopy {
  if (variant === 'action-required') return actionRequiredCopy[category];
  return pendingCopy[category];
}
