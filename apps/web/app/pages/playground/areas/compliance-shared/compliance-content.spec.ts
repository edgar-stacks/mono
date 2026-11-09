import { complianceCopy, complianceEmail, copyDeckGroups } from './compliance-content';

describe('compliance content', () => {
  test('the copy deck lists every copy group', () => {
    expect(copyDeckGroups.map(group => group.id).sort()).toEqual(
      Object.keys(complianceCopy).sort()
    );
  });

  test('email drafts open with the intro from the copy module', () => {
    expect(complianceEmail('dispute', 'extension').body.split('\n')[0]).toBe(
      complianceCopy.email.disputeIntro
    );
    expect(complianceEmail('support', 'mobile').body.split('\n')[0]).toBe(
      complianceCopy.email.supportIntro
    );
  });
});
