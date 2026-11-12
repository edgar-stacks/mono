import { bufferCVFromString, noneCV, serializeCV, standardPrincipalCV } from '@stacks/transactions';

import { createMarketData, createMarketPair } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import type { Fee } from '@app/features/fee-editor/fee-editor.context';

export const previewOrigin = 'http://localhost:3000';

export const previewAccount = {
  name: 'Account 1',
  index: 0,
  publicKey: '0329b076bc20f7b1592b2a1a5cb91dfefe8c966e50e256458e23dd2c5d63f8f1af',
  stxAddress: 'SPS8CKF63P16J28AYF7PXW9E5AACH0NZNTEFWSFE',
  stxBalance: createMoney(13_568_037, 'STX'),
};

export const previewRecipient = 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB';

export const previewLargeAmount = createMoney(1_234_567_890_000, 'STX');
export const previewSmallAmount = createMoney(500, 'STX');

export const previewStxMarketData = createMarketData(
  createMarketPair('STX', 'USD'),
  createMoney(85, 'USD')
);

export const previewFee: Fee = {
  priority: 'standard',
  txFee: createMoney(3000, 'STX'),
  time: '20–30 seconds',
};

export const previewNonce = 0;

export const previewContractCall = {
  contractAddress: 'SP000000000000000000002Q6VF78',
  contractName: 'bns',
  functionName: 'name-transfer',
  functionArgs: [
    bufferCVFromString('id'),
    bufferCVFromString('test'),
    standardPrincipalCV(previewRecipient),
    noneCV(),
  ].map(arg => serializeCV(arg)),
};

export const previewContractDeploy = {
  contractName: 'mock-contract-name',
  codeBody: `(define-data-var counter uint u0)

(define-public (increment)
  (ok (var-set counter (+ (var-get counter) u1))))

(define-read-only (get-counter)
  (var-get counter))`,
};
