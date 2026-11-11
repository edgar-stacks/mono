import { extractPhraseFromString } from './extract-phrase-from-string';

const SECRET_KEY_FORMATTED_POORLY = `1 balance
2 adult
3 board
4 true
5 diary
pear banana olympic street enhance

gift rely account      patient stereo one

during      banner shift globe romance

arrange dolphin disease`;

const SECRET_KEY_FORMATTED_CORRECTLY = `balance adult board true diary pear banana olympic street enhance gift rely account patient stereo one during banner shift globe romance arrange dolphin disease`;

const SECRET_KEY_COPIED_FROM_v3 = `1
almost
2
dumb
3
wave
4
rude
5
surround
6
jealous
7
shine
8
fruit
9
toward
10
method
11
yard
12
ribbon
13
gold
14
acid
15
cute
16
police
17
team
18
time
19
this
20
easy
21
heavy
22
fuel
23
trash
24
swing`;

const SECRET_KEY_COPIED_FROM_V3_FORMATTED = `almost dumb wave rude surround jealous shine fruit toward method yard ribbon gold acid cute police team time this easy heavy fuel trash swing`;

describe(extractPhraseFromString.name, () => {
  test('Extract secret key from poorly formatted string', () => {
    const key = extractPhraseFromString(SECRET_KEY_FORMATTED_POORLY);
    expect(key).toEqual(SECRET_KEY_FORMATTED_CORRECTLY);
  });

  test('Extract secret key from seed copied from v3 wallet', () => {
    const key = extractPhraseFromString(SECRET_KEY_COPIED_FROM_v3);
    expect(key).toEqual(SECRET_KEY_COPIED_FROM_V3_FORMATTED);
  });

  test('drops numbered list markers', () => {
    expect(extractPhraseFromString('1. alpha\n2.\tbravo\r\n3) charlie')).toEqual(
      'alpha bravo charlie'
    );
  });

  test('drops bullet list markers', () => {
    expect(extractPhraseFromString('- alpha\n- bravo')).toEqual('alpha bravo');
  });

  test('drops colon and hash list markers', () => {
    expect(extractPhraseFromString('1: alpha\n#2 bravo\n* charlie')).toEqual('alpha bravo charlie');
  });

  test('splits on next line characters', () => {
    expect(extractPhraseFromString('alpha\u0085bravo\u0085charlie')).toEqual('alpha bravo charlie');
  });

  test('splits on zero width spaces', () => {
    expect(extractPhraseFromString('alpha\u200Bbravo')).toEqual('alpha bravo');
  });

  test('splits on word joiners and byte order marks', () => {
    expect(extractPhraseFromString('alpha\u2060bravo\uFEFFcharlie')).toEqual('alpha bravo charlie');
  });

  test('splits on vertical tabs and form feeds', () => {
    expect(extractPhraseFromString('alpha\u000Bbravo\fcharlie')).toEqual('alpha bravo charlie');
  });
});
