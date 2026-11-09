import { bufferCVFromString, noneCV, serializeCV, standardPrincipalCV } from '@stacks/transactions';

import { createMarketData, createMarketPair } from '@leather.io/models';
import { createMoney, createMoneyFromDecimal } from '@leather.io/utils';

import type { TransferRecipient } from '@shared/models/form.model';

import type { Fee } from '@app/features/fee-editor/fee-editor.context';

export const previewFrameWidth = 390;
export const previewFrameHeight = 756;

export const previewRequester = 'http://localhost:3000';

export const previewSigner = {
  name: 'Account 1',
  index: 0,
  address: 'SPS8CKF63P16J28AYF7PXW9E5AACH0NZNTEFWSFE',
  publicKey: '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893',
};

const previewRecipientAddress = 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB';

export const previewAvailableBalance = createMoneyFromDecimal(100, 'STX');

export const previewStxMarketData = createMarketData(
  createMarketPair('STX', 'USD'),
  createMoneyFromDecimal(0.5, 'USD')
);

export const previewFee: Fee = {
  priority: 'standard',
  txFee: createMoney(400, 'STX'),
  time: '~10 – 20 min',
};

export const previewNonce = 7;

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
  address: previewSigner.address,
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
  { address: previewRecipientAddress, amount: createMoneyFromDecimal(1_234_567, 'STX') },
];
