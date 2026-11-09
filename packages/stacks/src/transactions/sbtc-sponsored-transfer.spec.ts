import {
  ClarityType,
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
  sbtcTransferManyFunctionName,
} from './sbtc-sponsored-transfer';

const publicKey = publicKeyToHex(privateKeyToPublic('11'.repeat(32) + '01'));
const sender = 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH';
const recipient = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
const feeRecipient = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';
const contractAddress = 'SNGWPN3XDAQE673MXYXF81016M50NHF5X5PWWM70';
const contractName = 'sbtc-token';
const contractId = `${contractAddress}.${contractName}`;
const assetName = 'sbtc-token';
const amount = 2_500_000n;
const fee = 1_200n;

type ContractCallOptions = Parameters<typeof makeUnsignedContractCall>[0];

function makeSponsoredTransferTx(overrides: Partial<ContractCallOptions> = {}) {
  return makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName: sbtcTransferManyFunctionName,
    functionArgs: buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      memo: 'hello',
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
      buildSbtcSponsoredTransferPostCondition({ sender, contractId, assetName, amount, fee }),
    ],
    ...overrides,
  });
}

function entry(to: string, value: bigint, from = sender) {
  return tupleCV({
    amount: uintCV(value),
    sender: principalCV(from),
    to: principalCV(to),
    memo: noneCV(),
  });
}

describe(buildSbtcTransferManyArgs.name, () => {
  test('builds two entries from the sender with the memo on the transfer entry only', () => {
    const [list] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      memo: 'hello',
      feeRecipient,
      fee,
    });

    expect(list).toEqual(
      listCV([
        tupleCV({
          amount: uintCV(amount),
          sender: principalCV(sender),
          to: principalCV(recipient),
          memo: someCV(bufferCVFromString('hello')),
        }),
        tupleCV({
          amount: uintCV(fee),
          sender: principalCV(sender),
          to: principalCV(feeRecipient),
          memo: noneCV(),
        }),
      ])
    );
  });

  test('uses no memo on either entry when none is given', () => {
    const [list] = buildSbtcTransferManyArgs({ sender, recipient, amount, feeRecipient, fee });
    if (list.type !== ClarityType.List) throw new Error('Expected a list');

    expect(list.value.map(value => value.type === ClarityType.Tuple && value.value.memo)).toEqual([
      noneCV(),
      noneCV(),
    ]);
  });
});

describe(buildSbtcSponsoredTransferPostCondition.name, () => {
  test('guards the sender sending exactly the amount plus the fee', () => {
    expect(
      buildSbtcSponsoredTransferPostCondition({ sender, contractId, assetName, amount, fee })
    ).toEqual(
      Pc.principal(sender)
        .willSendEq(amount + fee)
        .ft(contractId, assetName)
    );
  });
});

describe(getSbtcSponsoredTransferDetails.name, () => {
  test('extracts the details of a sponsored transfer', async () => {
    const tx = await makeSponsoredTransferTx();

    expect(getSbtcSponsoredTransferDetails(tx)).toEqual({
      contractId,
      assetName,
      sender,
      recipient,
      amount,
      memo: 'hello',
      feeRecipient,
      fee,
    });
  });

  test('rejects a transaction that is not sponsored', async () => {
    const tx = await makeSponsoredTransferTx({ sponsored: false });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects another function', async () => {
    const tx = await makeSponsoredTransferTx({ functionName: 'transfer' });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a list without exactly two entries', async () => {
    const tx = await makeSponsoredTransferTx({
      functionArgs: [listCV([entry(recipient, amount)])],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects entries that are not tuples', async () => {
    const tx = await makeSponsoredTransferTx({
      functionArgs: [listCV([uintCV(amount), uintCV(fee)])],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects entries from different senders', async () => {
    const tx = await makeSponsoredTransferTx({
      functionArgs: [listCV([entry(recipient, amount), entry(feeRecipient, fee, recipient)])],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a contract principal as the sender', async () => {
    const contractSender = `${sender}.vault`;
    const tx = await makeSponsoredTransferTx({
      functionArgs: [
        listCV([
          entry(recipient, amount, contractSender),
          entry(feeRecipient, fee, contractSender),
        ]),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post-condition for an amount other than the sum', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [Pc.principal(sender).willSendEq(amount).ft(contractId, assetName)],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post-condition on another contract', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [
        Pc.principal(sender)
          .willSendEq(amount + fee)
          .ft(`${contractAddress}.other-token`, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post-condition guarding another principal', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [
        Pc.principal(recipient)
          .willSendEq(amount + fee)
          .ft(contractId, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects allow mode', async () => {
    const tx = await makeSponsoredTransferTx({ postConditionMode: PostConditionMode.Allow });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });
});
