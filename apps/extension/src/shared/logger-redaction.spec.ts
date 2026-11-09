import { redactLogMessages } from './logger-redaction';

const testMnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const nativeSegwitAddress = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
const taprootAddress = 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr';
const legacyAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
const testnetAddress = 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl';
const stacksAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const stacksContractId = 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc';
const txid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const xpub =
  'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj';
const psbtBase64 = 'cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////';

function redactOne(message: unknown) {
  return redactLogMessages([message])[0];
}

describe(redactLogMessages.name, () => {
  it('keeps messages without sensitive data unchanged', () => {
    expect(redactLogMessages(['Transaction broadcast', { accountIndex: 2, fee: 1200 }])).toEqual([
      'Transaction broadcast',
      { accountIndex: 2, fee: 1200 },
    ]);
  });

  it('redacts bitcoin and stacks addresses inside text', () => {
    const redacted = redactOne(
      `Sent from ${nativeSegwitAddress} to ${taprootAddress}, ${legacyAddress}, ${testnetAddress} and ${stacksAddress}`
    );

    expect(redacted).toEqual(
      'Sent from [redacted] to [redacted], [redacted], [redacted] and [redacted]'
    );
  });

  it('keeps stacks contract identifiers', () => {
    expect(redactOne(`Calling ${stacksContractId}`)).toEqual(`Calling ${stacksContractId}`);
  });

  it('redacts txids, outpoints, public keys and raw hex', () => {
    expect(redactOne(`Spending ${txid}:0 with ${publicKey}`)).toEqual(
      'Spending [redacted]:0 with [redacted]'
    );
  });

  it('redacts extended public keys inside descriptors', () => {
    expect(redactOne(`wpkh([deadbeef/84'/0'/0']${xpub}/0/*)`)).toEqual(
      "wpkh([deadbeef/84'/0'/0'][redacted]/0/*)"
    );
  });

  it('redacts base64 PSBTs', () => {
    expect(redactOne(`Signing ${psbtBase64}`)).toEqual('Signing [redacted]');
  });

  it('redacts mnemonic phrases', () => {
    expect(redactOne(`Restoring ${testMnemonic}`)).toEqual('Restoring [redacted]');
    expect(redactOne(testMnemonic.toUpperCase())).toEqual('[redacted]');
  });

  it('keeps plain sentences made of a few mnemonic words', () => {
    expect(redactOne('Unable to sign the transaction')).toEqual('Unable to sign the transaction');
  });

  it('redacts values stored under sensitive keys', () => {
    expect(
      redactOne({
        address: 'any value',
        changeAddress: 'any value',
        recipientAddresses: ['any value'],
        txid: 'any value',
        psbt: 'any value',
        txHex: 'any value',
        descriptor: 'any value',
        publicKey: 'any value',
        mnemonic: 'any value',
        secretKey: 'any value',
        privateKey: 'any value',
        password: 'any value',
        method: 'signPsbt',
      })
    ).toEqual({
      address: '[redacted]',
      changeAddress: '[redacted]',
      recipientAddresses: '[redacted]',
      txid: '[redacted]',
      psbt: '[redacted]',
      txHex: '[redacted]',
      descriptor: '[redacted]',
      publicKey: '[redacted]',
      mnemonic: '[redacted]',
      secretKey: '[redacted]',
      privateKey: '[redacted]',
      password: '[redacted]',
      method: 'signPsbt',
    });
  });

  it('keeps counts and flags stored under sensitive keys', () => {
    expect(redactOne({ addressIndex: 0, hasAddress: true, addressCount: null })).toEqual({
      addressIndex: 0,
      hasAddress: true,
      addressCount: null,
    });
  });

  it('redacts nested coin selection data', () => {
    const coinSelection = {
      inputs: [{ address: nativeSegwitAddress, txid, vout: 1, value: 5000 }],
      outputs: [{ address: taprootAddress, value: 4000 }, { value: 800 }],
      fee: 200,
    };

    expect(redactOne(coinSelection)).toEqual({
      inputs: [{ address: '[redacted]', txid: '[redacted]', vout: 1, value: 5000 }],
      outputs: [{ address: '[redacted]', value: 4000 }, { value: 800 }],
      fee: 200,
    });
  });

  it('redacts byte arrays', () => {
    expect(redactOne({ key: new Uint8Array([1, 2, 3]) })).toEqual({ key: '[redacted]' });
  });

  it('redacts enumerable properties of errors', () => {
    const error = Object.assign(new Error('Request failed'), {
      detail: `Unknown address ${nativeSegwitAddress}`,
    });

    expect(redactOne(error)).toEqual({ detail: 'Unknown address [redacted]' });
  });

  it('does not mutate the logged values', () => {
    const value = { address: nativeSegwitAddress };
    redactOne(value);
    expect(value).toEqual({ address: nativeSegwitAddress });
  });

  it('handles circular references', () => {
    const value: Record<string, unknown> = { name: 'loop' };
    value.self = value;

    expect(redactOne(value)).toEqual({ name: 'loop', self: '[circular]' });
  });
});
