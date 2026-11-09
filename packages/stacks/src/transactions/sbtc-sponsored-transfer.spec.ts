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
} from './sbtc-sponsored-transfer';

const publicKey = publicKeyToHex(privateKeyToPublic('11'.repeat(32) + '01'));
const sender = 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH';
const recipient = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
const feeRecipient = 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP';
const contractAddress = 'SNGWPN3XDAQE673MXYXF81016M50NHF5X5PWWM70';
const contractName = 'sbtc-token';
const contractId = `${contractAddress}.${contractName}`;
const assetName = 'sbtc-token';
const amount = 25_000;
const fee = 300;

type ContractCallOptions = Parameters<typeof makeUnsignedContractCall>[0];

function makeSponsoredTransferTx(overrides: Partial<ContractCallOptions> = {}) {
  return makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName: 'transfer-many',
    functionArgs: buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      feeRecipient,
      fee,
      memo: 'invoice 42',
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

function transferEntry(entrySender: string, to: string, entryAmount: number) {
  return tupleCV({
    amount: uintCV(entryAmount),
    sender: principalCV(entrySender),
    to: principalCV(to),
    memo: noneCV(),
  });
}

describe(buildSbtcTransferManyArgs.name, () => {
  test('builds a transfer entry and a fee entry from the sender', () => {
    const [list] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      feeRecipient,
      fee,
      memo: 'invoice 42',
    });

    expect(list).toEqual(
      listCV([
        tupleCV({
          amount: uintCV(amount),
          sender: principalCV(sender),
          to: principalCV(recipient),
          memo: someCV(bufferCVFromString('invoice 42')),
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

  test('leaves the memo empty on both entries without a memo', () => {
    const [list] = buildSbtcTransferManyArgs({ sender, recipient, amount, feeRecipient, fee });

    if (list.type !== ClarityType.List) throw new Error('Expected a list');
    expect(list.value).toEqual([
      transferEntry(sender, recipient, amount),
      transferEntry(sender, feeRecipient, fee),
    ]);
  });
});

describe(buildSbtcSponsoredTransferPostCondition.name, () => {
  test('guards the sender sending exactly the amount plus the fee', () => {
    expect(
      buildSbtcSponsoredTransferPostCondition({
        sender,
        contractAddress,
        contractName,
        assetName,
        amount: 25_000n,
        fee: '300',
      })
    ).toEqual({
      type: 'ft-postcondition',
      address: sender,
      condition: 'eq',
      amount: '25300',
      asset: `${contractId}::${assetName}`,
    });
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
      amount: 25_000n,
      feeRecipient,
      fee: 300n,
      memo: 'invoice 42',
    });
  });

  test('accepts a contract principal recipient', async () => {
    const contractRecipient = `${recipient}.vault`;
    const tx = await makeSponsoredTransferTx({
      functionArgs: buildSbtcTransferManyArgs({
        sender,
        recipient: contractRecipient,
        amount,
        feeRecipient,
        fee,
      }),
    });

    expect(getSbtcSponsoredTransferDetails(tx)?.recipient).toEqual(contractRecipient);
  });

  test('rejects a transaction that is not sponsored', async () => {
    const tx = await makeSponsoredTransferTx({ sponsored: false });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a call to another function', async () => {
    const tx = await makeSponsoredTransferTx({ functionName: 'transfer' });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a list with a single entry', async () => {
    const tx = await makeSponsoredTransferTx({
      functionArgs: [listCV([transferEntry(sender, recipient, amount + fee)])],
      postConditions: [
        Pc.principal(sender)
          .willSendEq(amount + fee)
          .ft(contractId, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a list with more than two entries', async () => {
    const tx = await makeSponsoredTransferTx({
      functionArgs: [
        listCV([
          transferEntry(sender, recipient, amount),
          transferEntry(sender, feeRecipient, fee),
          transferEntry(sender, recipient, 1),
        ]),
      ],
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
      functionArgs: [
        listCV([
          transferEntry(sender, recipient, amount),
          transferEntry(recipient, feeRecipient, fee),
        ]),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a contract principal sender', async () => {
    const contractSender = `${sender}.wallet`;
    const tx = await makeSponsoredTransferTx({
      functionArgs: [
        listCV([
          transferEntry(contractSender, recipient, amount),
          transferEntry(contractSender, feeRecipient, fee),
        ]),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a transfer in allow mode', async () => {
    const tx = await makeSponsoredTransferTx({ postConditionMode: PostConditionMode.Allow });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition that only covers the amount', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [Pc.principal(sender).willSendEq(amount).ft(contractId, assetName)],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition guarding a different contract', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [
        Pc.principal(sender)
          .willSendEq(amount + fee)
          .ft(`${contractAddress}.other-token`, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition guarding a principal other than the sender', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [
        Pc.principal(recipient)
          .willSendEq(amount + fee)
          .ft(contractId, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a transfer carrying more than one post condition', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [
        Pc.principal(sender)
          .willSendEq(amount + fee)
          .ft(contractId, assetName),
        Pc.principal(sender).willSendEq(1).ustx(),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });
});
