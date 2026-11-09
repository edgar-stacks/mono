import {
  ClarityType,
  Pc,
  PostConditionMode,
  makeUnsignedContractCall,
  privateKeyToPublic,
  publicKeyToHex,
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
const feeRecipient = 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP';
const contractAddress = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
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
      memo: 'invoice 42',
      feeRecipient,
      fee,
    }),
    publicKey,
    fee: 0,
    nonce: 0,
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

describe(buildSbtcTransferManyArgs.name, () => {
  test('lists the recipient entry with the memo, then the fee entry', () => {
    const [list] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      memo: 'hello',
      feeRecipient,
      fee,
    });

    expect(list.type).toEqual(ClarityType.List);
    if (list.type !== ClarityType.List) return;
    expect(list.value).toHaveLength(2);
    const [transferEntry, feeEntry] = list.value;
    if (transferEntry.type !== ClarityType.Tuple || feeEntry.type !== ClarityType.Tuple) {
      throw new Error('Expected tuple entries');
    }
    expect(transferEntry.value.to).toEqual({
      type: ClarityType.PrincipalStandard,
      value: recipient,
    });
    expect(transferEntry.value.amount).toEqual(uintCV(amount));
    expect(transferEntry.value.memo.type).toEqual(ClarityType.OptionalSome);
    expect(feeEntry.value.to).toEqual({ type: ClarityType.PrincipalStandard, value: feeRecipient });
    expect(feeEntry.value.amount).toEqual(uintCV(fee));
    expect(feeEntry.value.memo.type).toEqual(ClarityType.OptionalNone);
  });
});

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
    ).toEqual(
      Pc.principal(sender)
        .willSendEq(amount + fee)
        .ft(contractId, assetName)
    );
  });
});

describe(getSbtcSponsoredTransferDetails.name, () => {
  test('decodes a compliant sponsored transfer', async () => {
    const tx = await makeSponsoredTransferTx();

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

  test('rejects a transaction that is not sponsored', async () => {
    const tx = await makeSponsoredTransferTx({ sponsored: false });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a list without exactly two entries', async () => {
    const [list] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      feeRecipient,
      fee,
    });
    if (list.type !== ClarityType.List) throw new Error('Expected a list');
    const tx = await makeSponsoredTransferTx({
      functionArgs: [{ ...list, value: [list.value[0]] }],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects entries from different senders', async () => {
    const [ownList] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      feeRecipient,
      fee,
    });
    const [otherList] = buildSbtcTransferManyArgs({
      sender: recipient,
      recipient,
      amount,
      feeRecipient,
      fee,
    });
    if (ownList.type !== ClarityType.List || otherList.type !== ClarityType.List) {
      throw new Error('Expected lists');
    }
    const tx = await makeSponsoredTransferTx({
      functionArgs: [{ ...ownList, value: [ownList.value[0], otherList.value[1]] }],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition that does not cover the summed amount', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [Pc.principal(sender).willSendEq(amount).ft(contractId, assetName)],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition guarding another principal', async () => {
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
