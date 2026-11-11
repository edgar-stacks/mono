import { tlds } from './tlds-list';

const tldRegex = tlds.join('|');
const urlRegex = new RegExp(`\\b.*\\s*\\.\\s*(${tldRegex})\\b`, 'gi');

const spamWords = ['won', 'win', 'click'];
const spamWordRegex = new RegExp(`\\b(${spamWords.join('|')})\\b`, 'i');
export const spamReplacement = 'Suspicious token';

function spamUrlFilter(input: string) {
  return input.match(urlRegex);
}

function spamWordFilter(input: string): boolean {
  return spamWordRegex.test(input);
}

interface SpamFilterArgs {
  input: string;
  whitelist: string[];
}

export function spamFilter({ input, whitelist }: SpamFilterArgs): string {
  if (whitelist.includes(input)) return input;

  const urlFound = spamUrlFilter(input);
  const spamWordsFound = spamWordFilter(input);

  if (urlFound || spamWordsFound) {
    return spamReplacement;
  }

  return input;
}
