import { spamFilter, spamReplacement } from './spam-filter';

describe('Spam filter', () => {
  it('should allow valid tokens', () => {
    expect(spamFilter({ input: 'This token name is OK', whitelist: [] })).not.toEqual(
      spamReplacement
    );
  });

  it('should detect tlds with dot in strings and replace content', () => {
    expect(spamFilter({ input: 'fake.com', whitelist: [] })).toEqual(spamReplacement);
    expect(spamFilter({ input: 'random text http://fake.de', whitelist: [] })).toEqual(
      spamReplacement
    );
    expect(spamFilter({ input: 'random text .    de', whitelist: [] })).toEqual(spamReplacement);
    expect(spamFilter({ input: 'random text.gr', whitelist: [] })).toEqual(spamReplacement);
  });

  it('should allow if without tld or with tld without dot', () => {
    expect(spamFilter({ input: 'www.fake', whitelist: [] })).toEqual('www.fake');
    expect(spamFilter({ input: 'random text http://fake', whitelist: [] })).toEqual(
      'random text http://fake'
    );
    expect(spamFilter({ input: 'random text xxx com', whitelist: [] })).toEqual(
      'random text xxx com'
    );
  });

  it('should detect spam words in strings and replace content', () => {
    expect(spamFilter({ input: 'You won some stx', whitelist: [] })).toEqual(spamReplacement);
    expect(spamFilter({ input: 'You Win some stx', whitelist: [] })).toEqual(spamReplacement);
    expect(spamFilter({ input: 'You Won some stx', whitelist: [] })).toEqual(spamReplacement);
    expect(spamFilter({ input: 'click here for some stx', whitelist: [] })).toEqual(
      spamReplacement
    );
    expect(spamFilter({ input: 'Click here for some stx', whitelist: [] })).toEqual(
      spamReplacement
    );
  });

  it('should allow names that only contain spam words inside other words', () => {
    const honestNames = [
      'Darwin',
      'Wonderland',
      'Window Finance',
      'Winter Token',
      'Twin Peaks DAO',
      'Clickhouse Credits',
      'Rewind',
      'Swing',
      'Erwin',
      'Wondrous',
      'Baldwin',
      'Winklevoss Dollar',
      'Unwind Protocol',
      'Crosswind',
      'Goodwin',
      'Twins',
      'Wonton',
      'Winery Coin',
      'Kiwini',
      'Brownie Points',
    ];
    honestNames.forEach(name => expect(spamFilter({ input: name, whitelist: [] })).toEqual(name));
  });

  it('should flag names where a spam word or url stands alone', () => {
    const spamNames = [
      'You won 500 STX',
      'WIN a free NFT',
      'click here to claim',
      'Claim now: www.free-stx.com',
      'Visit https://airdrop-stacks.io/claim?ref=you',
      'You WON | claim at stx-rewards.net',
    ];
    spamNames.forEach(name =>
      expect(spamFilter({ input: name, whitelist: [] })).toEqual(spamReplacement)
    );
  });
});
