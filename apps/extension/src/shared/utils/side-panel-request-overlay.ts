import { z } from 'zod/mini';

const sidePanelOverlayMessageSource = 'leather-side-panel-overlay';

const sidePanelRequestCategories = ['connection', 'signature', 'transaction', 'generic'] as const;
export type SidePanelRequestCategory = (typeof sidePanelRequestCategories)[number];

const sidePanelOverlayVariants = ['pending', 'action-required'] as const;
export type SidePanelOverlayVariant = (typeof sidePanelOverlayVariants)[number];

const connectionMethods: readonly string[] = ['getAddresses', 'stx_getAddresses'];

const signatureMethods: readonly string[] = [
  'signMessage',
  'stx_signMessage',
  'stx_signStructuredMessage',
];

const transactionMethods: readonly string[] = [
  'sendTransfer',
  'signPsbt',
  'stx_callContract',
  'stx_deployContract',
  'stx_signTransaction',
  'stx_transferSip10Ft',
  'stx_transferSip9Nft',
  'stx_transferStx',
];

export function getSidePanelRequestCategory(method: string): SidePanelRequestCategory {
  if (connectionMethods.includes(method)) return 'connection';
  if (signatureMethods.includes(method)) return 'signature';
  if (transactionMethods.includes(method)) return 'transaction';
  return 'generic';
}

interface SidePanelOverlayCopy {
  title: string;
  description: string;
  actionLabel?: string;
}

const pendingCopy: Record<SidePanelRequestCategory, SidePanelOverlayCopy> = {
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
    description: 'This site wants you to approve a transaction. Review it in the Leather panel.',
  },
  generic: {
    title: 'Review in Leather',
    description: 'This site sent a request to your wallet. Continue in the Leather panel.',
  },
};

const actionRequiredCopy: Record<SidePanelRequestCategory, SidePanelOverlayCopy> = {
  connection: {
    title: 'Connection request waiting',
    description: 'This site wants to connect to your wallet. Open Leather to review it.',
    actionLabel: 'Open Leather',
  },
  signature: {
    title: 'Signature request waiting',
    description: 'This site wants you to sign a message. Open Leather to review it.',
    actionLabel: 'Open Leather',
  },
  transaction: {
    title: 'Transaction request waiting',
    description: 'This site wants you to approve a transaction. Open Leather to review it.',
    actionLabel: 'Open Leather',
  },
  generic: {
    title: 'Request waiting in Leather',
    description: 'This site sent a request to your wallet. Open Leather to continue.',
    actionLabel: 'Open Leather',
  },
};

interface GetSidePanelOverlayCopyArgs {
  category: SidePanelRequestCategory;
  variant: SidePanelOverlayVariant;
}
export function getSidePanelOverlayCopy({ category, variant }: GetSidePanelOverlayCopyArgs) {
  if (variant === 'action-required') return actionRequiredCopy[category];
  return pendingCopy[category];
}

const sidePanelOverlayShowMessageSchema = z.object({
  source: z.literal(sidePanelOverlayMessageSource),
  type: z.literal('show'),
  category: z.enum(sidePanelRequestCategories),
  variant: z.enum(sidePanelOverlayVariants),
});
type SidePanelOverlayShowMessage = z.infer<typeof sidePanelOverlayShowMessageSchema>;

const sidePanelOverlayHideMessageSchema = z.object({
  source: z.literal(sidePanelOverlayMessageSource),
  type: z.literal('hide'),
});
type SidePanelOverlayHideMessage = z.infer<typeof sidePanelOverlayHideMessageSchema>;

const sidePanelOverlayCommandSchema = z.union([
  sidePanelOverlayShowMessageSchema,
  sidePanelOverlayHideMessageSchema,
]);
type SidePanelOverlayCommand = z.infer<typeof sidePanelOverlayCommandSchema>;

const sidePanelOverlayActionSchema = z.object({
  source: z.literal(sidePanelOverlayMessageSource),
  type: z.enum(['open-panel', 'dismiss']),
});
type SidePanelOverlayAction = z.infer<typeof sidePanelOverlayActionSchema>;

export function parseSidePanelOverlayCommand(message: unknown): SidePanelOverlayCommand | null {
  const result = sidePanelOverlayCommandSchema.safeParse(message);
  return result.success ? result.data : null;
}

export function parseSidePanelOverlayAction(message: unknown): SidePanelOverlayAction | null {
  const result = sidePanelOverlayActionSchema.safeParse(message);
  return result.success ? result.data : null;
}

export function createSidePanelOverlayShowMessage({
  category,
  variant,
}: GetSidePanelOverlayCopyArgs): SidePanelOverlayShowMessage {
  return { source: sidePanelOverlayMessageSource, type: 'show', category, variant };
}

export function createSidePanelOverlayHideMessage(): SidePanelOverlayHideMessage {
  return { source: sidePanelOverlayMessageSource, type: 'hide' };
}

export function createSidePanelOverlayActionMessage(
  type: SidePanelOverlayAction['type']
): SidePanelOverlayAction {
  return { source: sidePanelOverlayMessageSource, type };
}
