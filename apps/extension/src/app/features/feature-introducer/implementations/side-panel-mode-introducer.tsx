import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

import { Button } from '@leather.io/ui';

import { isSidePanelPage } from '@shared/side-panel';

import { useHasSeenFeature } from '@app/store/settings/settings.selectors';

import { FeatureIntroducer } from '../feature-introducer';
import { useFeatureIntroducer } from '../use-feature-introducer';

const multiWalletIntroducerId = 'multi-wallet-support';

export function SidePanelModeIntroducer() {
  const { shouldShow, markAsSeen } = useFeatureIntroducer('side-panel-mode');
  const hasSeenMultiWalletIntroducer = useHasSeenFeature(multiWalletIntroducerId);

  if (!shouldShow || !hasSeenMultiWalletIntroducer || !isSidePanelPage()) return null;

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
          Leather now opens beside the page, so you can review requests without losing sight of the
          app. Switch back to the pop-up anytime in Settings.
        </FeatureIntroducer.Description>
      </FeatureIntroducer.Content>

      <FeatureIntroducer.Actions>
        <Button
          data-testid={SharedComponentsSelectors.FeatureIntroducerTryItOutBtn}
          onClick={markAsSeen}
        >
          Got it
        </Button>
      </FeatureIntroducer.Actions>
    </FeatureIntroducer.Root>
  );
}
