import { z } from 'zod/mini';

export const sidePanelOverlaySource = 'leather-side-panel-overlay';

export const sidePanelOverlayMethods = {
  show: 'side-panel-overlay/show',
  hide: 'side-panel-overlay/hide',
  openPanel: 'side-panel-overlay/open-panel',
  dismiss: 'side-panel-overlay/dismiss',
} as const;

const sidePanelRequestCategories = ['connection', 'signature', 'transaction', 'generic'] as const;
export type SidePanelRequestCategory = (typeof sidePanelRequestCategories)[number];

const sidePanelOverlayVariants = ['review', 'action-required'] as const;
export type SidePanelOverlayVariant = (typeof sidePanelOverlayVariants)[number];

const connectionMethods = new Set(['getAddresses', 'stx_getAddresses']);

const signatureMethods = new Set(['signMessage', 'stx_signMessage', 'stx_signStructuredMessage']);

const transactionMethods = new Set([
  'signPsbt',
  'sendTransfer',
  'stx_callContract',
  'stx_deployContract',
  'stx_signTransaction',
  'stx_transferStx',
  'stx_transferSip10Ft',
  'stx_transferSip9Nft',
]);

export function getSidePanelRequestCategory(method: string): SidePanelRequestCategory {
  if (connectionMethods.has(method)) return 'connection';
  if (signatureMethods.has(method)) return 'signature';
  if (transactionMethods.has(method)) return 'transaction';
  return 'generic';
}

interface SidePanelOverlayCopy {
  title: string;
  description: string;
  actionLabel?: string;
}

const reviewCopy: Record<SidePanelRequestCategory, SidePanelOverlayCopy> = {
  connection: {
    title: 'Review connection in Leather',
    description:
      'This site wants to connect to your wallet. Approve or cancel in the Leather panel.',
  },
  signature: {
    title: 'Review signature in Leather',
    description: 'This site wants you to sign a message. Approve or cancel in the Leather panel.',
  },
  transaction: {
    title: 'Review transaction in Leather',
    description:
      'This site wants you to approve a transaction. Check the details in the Leather panel.',
  },
  generic: {
    title: 'Review in Leather',
    description: 'This site sent a request to your wallet. Continue in the Leather panel.',
  },
};

const actionRequiredDescription = 'Open the Leather panel to review this request.';

export function getSidePanelOverlayCopy(
  category: SidePanelRequestCategory,
  variant: SidePanelOverlayVariant
): SidePanelOverlayCopy {
  const { title } = reviewCopy[category];
  if (variant === 'action-required')
    return { title, description: actionRequiredDescription, actionLabel: 'Open Leather' };
  return reviewCopy[category];
}

const showOverlayMessageSchema = z.object({
  source: z.literal(sidePanelOverlaySource),
  method: z.literal(sidePanelOverlayMethods.show),
  payload: z.object({
    requestId: z.string(),
    category: z.enum(sidePanelRequestCategories),
    variant: z.enum(sidePanelOverlayVariants),
  }),
});
export type ShowSidePanelOverlayMessage = z.infer<typeof showOverlayMessageSchema>;

const hideOverlayMessageSchema = z.object({
  source: z.literal(sidePanelOverlaySource),
  method: z.literal(sidePanelOverlayMethods.hide),
});
type HideSidePanelOverlayMessage = z.infer<typeof hideOverlayMessageSchema>;

const overlayActionMessageSchema = z.object({
  source: z.literal(sidePanelOverlaySource),
  method: z.enum([sidePanelOverlayMethods.openPanel, sidePanelOverlayMethods.dismiss]),
});
type SidePanelOverlayActionMessage = z.infer<typeof overlayActionMessageSchema>;

export function parseShowSidePanelOverlayMessage(message: unknown) {
  const result = showOverlayMessageSchema.safeParse(message);
  return result.success ? result.data : null;
}

export function isHideSidePanelOverlayMessage(message: unknown) {
  return hideOverlayMessageSchema.safeParse(message).success;
}

export function parseSidePanelOverlayActionMessage(message: unknown) {
  const result = overlayActionMessageSchema.safeParse(message);
  return result.success ? result.data : null;
}

interface CreateShowSidePanelOverlayMessageArgs {
  requestId: string;
  category: SidePanelRequestCategory;
  variant: SidePanelOverlayVariant;
}
export function createShowSidePanelOverlayMessage(
  payload: CreateShowSidePanelOverlayMessageArgs
): ShowSidePanelOverlayMessage {
  return { source: sidePanelOverlaySource, method: sidePanelOverlayMethods.show, payload };
}

export function createHideSidePanelOverlayMessage(): HideSidePanelOverlayMessage {
  return { source: sidePanelOverlaySource, method: sidePanelOverlayMethods.hide };
}

export function createSidePanelOverlayActionMessage(
  method: SidePanelOverlayActionMessage['method']
): SidePanelOverlayActionMessage {
  return { source: sidePanelOverlaySource, method };
}
