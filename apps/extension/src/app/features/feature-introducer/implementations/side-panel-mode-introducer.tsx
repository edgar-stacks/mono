import { Button } from '@leather.io/ui';

import { IS_TEST_ENV } from '@shared/environment';
import { isSidePanelSupported } from '@shared/side-panel/side-panel';

import { useHasSeenFeature } from '@app/store/settings/settings.selectors';

import { FeatureIntroducer } from '../feature-introducer';
import { useFeatureIntroducer } from '../use-feature-introducer';

export function SidePanelModeIntroducer() {
  const { shouldShow, markAsSeen } = useFeatureIntroducer('side-panel-mode');
  const hasSeenMultiWalletIntroducer = useHasSeenFeature('multi-wallet-support');

  if (!shouldShow || !hasSeenMultiWalletIntroducer || IS_TEST_ENV || !isSidePanelSupported())
    return null;

  return (
    <FeatureIntroducer.Root onClose={markAsSeen}>
      <FeatureIntroducer.Content>
        <FeatureIntroducer.Label>Introducing</FeatureIntroducer.Label>

        <FeatureIntroducer.Title>
          Sidebar
          <br />
          mode
        </FeatureIntroducer.Title>

        <FeatureIntroducer.Description>
          Leather now opens beside the page, so you can review app requests without losing sight of
          the app. Switch it off any time in Settings.
        </FeatureIntroducer.Description>
      </FeatureIntroducer.Content>

      <FeatureIntroducer.Actions>
        <Button onClick={markAsSeen}>Got it</Button>
      </FeatureIntroducer.Actions>
    </FeatureIntroducer.Root>
  );
}
