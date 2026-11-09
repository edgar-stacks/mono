import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

import { Button } from '@leather.io/ui';

import { IS_TEST_ENV } from '@shared/environment';
import { isSidePanelSupported } from '@shared/side-panel/side-panel';

import { useIsSidePanelModeEnabled } from '@app/store/settings/settings.selectors';

import { FeatureIntroducer } from '../feature-introducer';
import { useFeatureIntroducer } from '../use-feature-introducer';
import { multiWalletIntroducerId } from './multi-wallet-introducer';

const sidePanelModeIntroducerId = 'side-panel-mode';

export function SidePanelModeIntroducer() {
  const { shouldShow, markAsSeen } = useFeatureIntroducer(sidePanelModeIntroducerId);
  const { shouldShow: isMultiWalletIntroducerShowing } =
    useFeatureIntroducer(multiWalletIntroducerId);
  const isSidePanelModeEnabled = useIsSidePanelModeEnabled();

  if (!shouldShow || isMultiWalletIntroducerShowing) return null;
  if (IS_TEST_ENV || !isSidePanelSupported() || !isSidePanelModeEnabled) return null;

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
          the site. Turn it off anytime in Settings.
        </FeatureIntroducer.Description>
      </FeatureIntroducer.Content>

      <FeatureIntroducer.Actions>
        <Button
          data-testid={SharedComponentsSelectors.SidePanelModeIntroducerGotItBtn}
          onClick={markAsSeen}
        >
          Got it
        </Button>
      </FeatureIntroducer.Actions>
    </FeatureIntroducer.Root>
  );
}
