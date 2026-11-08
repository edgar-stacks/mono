import { logger } from './logger';
import { redactLogArgs } from './logger-redaction';

vi.mock('./logger-redaction', () => ({ redactLogArgs: vi.fn(() => ['message']) }));

describe('logger', () => {
  beforeEach(() => vi.mocked(redactLogArgs).mockClear());

  it('skips redaction for levels that are not emitted', () => {
    logger.debug('message', { address: 'bc1q' });
    expect(redactLogArgs).not.toHaveBeenCalled();
  });

  it('redacts arguments for levels that are emitted', () => {
    logger.warn('message', { address: 'bc1q' });
    expect(redactLogArgs).toHaveBeenCalledWith(['message', { address: 'bc1q' }]);
  });
});
