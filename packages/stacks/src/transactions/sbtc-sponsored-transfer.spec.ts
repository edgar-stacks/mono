import {
  Pc,
  PostConditionMode,
  bufferCVFromString,
  listCV,
  makeUnsignedContractCall,
  noneCV,
  principalCV,
  privateKeyToPublic,
  publicKeyToHex,
  someCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions';

import {
  buildSbtcSponsoredTransferPostCondition,
  buildSbtcTransferManyArgs,
  getSbtcSponsoredTransferDetails,
} from './sbtc-sponsored-transfer';

const publicKey = publicKeyToHex(privateKeyToPublic('11'.repeat(32) + '01'));
const sender = 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH';
const otherSender = 'ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA';
const recipient = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
const feeRecipient = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
const contractAddress = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
const contractName = 'sbtc-token';
const contractId = `${contractAddress}.${contractName}`;
const assetName = 'sbtc-token';
const amount = 2_500_000n;
const fee = 1_200n;

type ContractCallOptions = Parameters<typeof makeUnsignedContractCall>[0];

function makeSponsoredTx(overrides: Partial<ContractCallOptions> = {}) {
  return makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName: 'transfer-many',
    functionArgs: buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      memo: 'invoice 42',
      feeRecipient,
      fee,
    }),
    publicKey,
    fee: 0,
    nonce: 3,
    network: 'testnet',
    sponsored: true,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      buildSbtcSponsoredTransferPostCondition({
        sender,
        contractAddress,
        contractName,
        assetName,
        amount,
        fee,
      }),
    ],
    ...overrides,
  });
}

function transferEntry(from: string, to: string, value: bigint) {
  return tupleCV({
    amount: uintCV(value),
    sender: principalCV(from),
    to: principalCV(to),
    memo: noneCV(),
  });
}

describe(buildSbtcSponsoredTransferPostCondition.name, () => {
  test('guards the sender for exactly amount plus fee', () => {
    expect(
      buildSbtcSponsoredTransferPostCondition({
        sender,
        contractAddress,
        contractName,
        assetName,
        amount,
        fee,
      })
    ).toEqual({
      type: 'ft-postcondition',
      address: sender,
      condition: 'eq',
      amount: '2501200',
      asset: `${contractId}::${assetName}`,
    });
  });
});

describe(getSbtcSponsoredTransferDetails.name, () => {
  test('decodes the transfer and fee entries', async () => {
    const tx = await makeSponsoredTx();

    expect(getSbtcSponsoredTransferDetails(tx)).toEqual({
      contractId,
      assetName,
      sender,
      recipient,
      amount,
      memo: 'invoice 42',
      feeRecipient,
      fee,
    });
  });

  test('puts the memo on the transfer entry only', () => {
    expect(
      buildSbtcTransferManyArgs({ sender, recipient, amount, memo: 'memo', feeRecipient, fee })
    ).toEqual([
      listCV([
        tupleCV({
          amount: uintCV(amount),
          sender: principalCV(sender),
          to: principalCV(recipient),
          memo: someCV(bufferCVFromString('memo')),
        }),
        transferEntry(sender, feeRecipient, fee),
      ]),
    ]);
  });

  test('rejects a transaction that is not sponsored', async () => {
    const tx = await makeSponsoredTx({ sponsored: false });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a list without exactly two entries', async () => {
    const tx = await makeSponsoredTx({
      functionArgs: [listCV([transferEntry(sender, recipient, amount)])],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects entries from different senders', async () => {
    const tx = await makeSponsoredTx({
      functionArgs: [
        listCV([
          transferEntry(sender, recipient, amount),
          transferEntry(otherSender, feeRecipient, fee),
        ]),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition that does not cover the summed amount', async () => {
    const tx = await makeSponsoredTx({
      postConditions: [Pc.principal(sender).willSendEq(amount).ft(contractId, assetName)],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition on another principal', async () => {
    const tx = await makeSponsoredTx({
      postConditions: [
        Pc.principal(otherSender)
          .willSendEq(amount + fee)
          .ft(contractId, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects allow mode', async () => {
    const tx = await makeSponsoredTx({ postConditionMode: PostConditionMode.Allow });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects another function', async () => {
    const tx = await makeSponsoredTx({ functionName: 'transfer' });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });
});
