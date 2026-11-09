import {
  ClarityType,
  Pc,
  PostConditionMode,
  makeUnsignedContractCall,
  noneCV,
  principalCV,
  privateKeyToPublic,
  publicKeyToHex,
  uintCV,
} from '@stacks/transactions';

import {
  SBTC_TRANSFER_MANY_FUNCTION_NAME,
  buildSbtcSponsoredTransferPostCondition,
  buildSbtcTransferManyArgs,
  getSbtcSponsoredTransferDetails,
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
    functionName: SBTC_TRANSFER_MANY_FUNCTION_NAME,
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
    nonce: 0,
    network: 'testnet',
    sponsored: true,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      buildSbtcSponsoredTransferPostCondition({ sender, amount, fee, contractId, assetName }),
    ],
    ...overrides,
  });
}

describe(buildSbtcSponsoredTransferPostCondition.name, () => {
  test('guards the sender for the amount plus the fee', () => {
    expect(
      buildSbtcSponsoredTransferPostCondition({
        sender,
        amount: '100',
        fee: '25',
        contractId,
        assetName,
      })
    ).toEqual(Pc.principal(sender).willSendEq(125n).ft(contractId, assetName));
  });
});

describe(getSbtcSponsoredTransferDetails.name, () => {
  test('decodes a sponsored transfer with a fee entry', async () => {
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
      total: amount + fee,
    });
  });

  test('returns null when the transaction is not sponsored', async () => {
    const tx = await makeSponsoredTransferTx({ sponsored: false });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('returns null for a list without exactly two entries', async () => {
    const [list] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      feeRecipient,
      fee,
    });
    if (list.type !== ClarityType.List) throw new Error('Expected a list');
    const tx = await makeSponsoredTransferTx({
      functionArgs: [{ ...list, value: [...list.value, list.value[0]] }],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('returns null when the entries come from different senders', async () => {
    const [transferEntry] = buildSbtcTransferManyArgs({
      sender,
      recipient,
      amount,
      feeRecipient,
      fee,
    });
    const [otherSenderEntry] = buildSbtcTransferManyArgs({
      sender: recipient,
      recipient,
      amount,
      feeRecipient,
      fee,
    });
    if (transferEntry.type !== ClarityType.List || otherSenderEntry.type !== ClarityType.List) {
      throw new Error('Expected a list');
    }
    const tx = await makeSponsoredTransferTx({
      functionArgs: [
        { ...transferEntry, value: [transferEntry.value[0], otherSenderEntry.value[1]] },
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('returns null when the post condition does not cover the fee', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [Pc.principal(sender).willSendEq(amount).ft(contractId, assetName)],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('returns null when the post condition guards another principal', async () => {
    const tx = await makeSponsoredTransferTx({
      postConditions: [
        Pc.principal(recipient)
          .willSendEq(amount + fee)
          .ft(contractId, assetName),
      ],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('returns null in allow mode', async () => {
    const tx = await makeSponsoredTransferTx({ postConditionMode: PostConditionMode.Allow });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });

  test('returns null for a plain transfer call', async () => {
    const tx = await makeSponsoredTransferTx({
      functionName: 'transfer',
      functionArgs: [uintCV(amount), principalCV(sender), principalCV(recipient), noneCV()],
    });

    expect(getSbtcSponsoredTransferDetails(tx)).toBeNull();
  });
});
