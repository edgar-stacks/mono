import { bufferCVFromString, noneCV, serializeCV, standardPrincipalCV } from '@stacks/transactions';

import { createMarketData, createMarketPair } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import type { TransferRecipient } from '@shared/models/form.model';

import type { Fee } from '@app/features/fee-editor/fee-editor.context';

export const previewFrameWidth = 390;
export const previewFrameHeight = 756;

export const previewOrigin = 'http://localhost:3000';

export const previewStxMarketData = createMarketData(
  createMarketPair('STX', 'USD'),
  createMoney(50, 'USD')
);

export const previewAccount = {
  name: 'Account 1',
  index: 0,
  address: 'SPS8CKF63P16J28AYF7PXW9E5AACH0NZNTEFWSFE',
  publicKey: '0329b076bc20f7b1592b2a1a5cb91dfefe8c966e50e256458e23dd2c5d63f8f1af',
  availableBalance: createMoney(1_200_000_000, 'STX'),
};

export const previewStandardFee: Fee = {
  priority: 'standard',
  txFee: createMoney(400, 'STX'),
  time: '~10 – 20 min',
};

export const previewNonce = 7;

const previewRecipientAddress = 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB';

export const previewContractCall = {
  contractAddress: 'SP000000000000000000002Q6VF78',
  contractName: 'bns',
  functionName: 'name-transfer',
  functionArgs: [
    bufferCVFromString('id'),
    bufferCVFromString('test'),
    standardPrincipalCV(previewRecipientAddress),
    noneCV(),
  ].map(arg => serializeCV(arg)),
};

export const previewContractDeploy = {
  address: previewAccount.address,
  contractName: 'mock-contract-name',
  codeBody: [
    '(define-fungible-token preview-token)',
    '',
    '(define-public (transfer (amount uint) (sender principal) (recipient principal))',
    '  (ft-transfer? preview-token amount sender recipient))',
  ].join('\n'),
};

export const previewSmallTransfer: TransferRecipient[] = [
  { address: previewRecipientAddress, amount: createMoney(100, 'STX') },
];

export const previewLargeTransfer: TransferRecipient[] = [
  { address: previewRecipientAddress, amount: createMoney(1_234_567_000_000, 'STX') },
];

export const previewMultisigTransfer: TransferRecipient[] = [
  { address: previewRecipientAddress, amount: createMoney(500, 'STX') },
];

export const previewMemo = 'mock-memo';
