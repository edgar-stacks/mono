import { t } from '@lingui/core/macro';

import {
  ALEX_LINK,
  ARKADIKO_LINK,
  BITFLOW_LINK,
  GRANITE_LINK,
  HERMETICA_LINK,
  VELAR_LINK,
  ZEST_LINK,
} from '@leather.io/constants';
import {
  AlexLogo,
  ArkadikoLogo,
  BitflowLogo,
  CharismaLogo,
  FastPoolLogo,
  GraniteLogo,
  HermeticaLogo,
  LeatherLogo,
  LisaLogo,
  PlanBetterLogo,
  RestakeLogo,
  StackingDaoLogo,
  VelarLogo,
  XverseLogo,
  ZestLogo,
} from '@leather.io/ui/native';

export function getDappMap() {
  return {
    alex: {
      icon: AlexLogo,
      title: t`Alex`,
      url: ALEX_LINK,
    },
    lisa: {
      icon: LisaLogo,
      title: t`Lisa`,
      url: 'https://lisalab.io',
    },
    arkadiko: {
      icon: ArkadikoLogo,
      title: t`Arkadiko`,
      url: ARKADIKO_LINK,
    },
    planbetter: {
      icon: PlanBetterLogo,
      title: t`PlanBetter`,
      url: 'https://planbetter.com',
    },
    bitflow: {
      icon: BitflowLogo,
      title: t`Bitflow`,
      url: BITFLOW_LINK,
    },
    restake: {
      icon: RestakeLogo,
      title: t`Restake`,
      url: 'https://restake.net',
    },
    charisma: {
      icon: CharismaLogo,
      title: t`Charisma`,
      url: 'https://charisma.rocks',
    },
    stackingdao: {
      icon: StackingDaoLogo,
      title: t`StackingDAO`,
      url: 'https://stackingdao.com',
    },
    fastpool: {
      icon: FastPoolLogo,
      title: t`FastPool`,
      url: 'https://fastpool.org',
    },
    velar: {
      icon: VelarLogo,
      title: t`Velar`,
      url: VELAR_LINK,
    },
    granite: {
      icon: GraniteLogo,
      title: t`Granite`,
      url: GRANITE_LINK,
    },
    xverse: {
      icon: XverseLogo,
      title: t`Xverse`,
      url: 'https://xverse.app',
    },
    hermetica: {
      icon: HermeticaLogo,
      title: t`Hermetica`,
      url: HERMETICA_LINK,
    },
    zest: {
      icon: ZestLogo,
      title: t`Zest`,
      url: ZEST_LINK,
    },
    leather: {
      icon: LeatherLogo,
      title: t`Leather`,
      url: 'https://leather.io',
    },
  };
}
