import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import { Flex } from 'leather-styles/jsx';

import { type BitcoinNetwork } from '@leather.io/models';
import { useOnMount } from '@leather.io/ui';

import type { AddNetworkFormValues } from '@app/pages/network/components/use-add-network';

import { BitcoinApiSection } from './bitcoin-api-section';
import { NetworkNameSection } from './network-name-section';
import { bitcoinNetworkPresets } from './network-presets';
import { StacksApiSection } from './stacks-api-section';

interface NetworkFormFieldsProps {
  isEditNetworkMode?: boolean;
}

export function NetworkFormFields({ isEditNetworkMode }: NetworkFormFieldsProps) {
  const { getValues, setValue } = useFormContext<AddNetworkFormValues>();
  const setStacksUrl = useCallback(
    (value: string) => {
      setValue('stacksUrl', value, { shouldDirty: true });
    },
    [setValue]
  );

  const setBitcoinUrl = useCallback(
    (value: string) => {
      setValue('bitcoinUrl', value, { shouldDirty: true });
    },
    [setValue]
  );

  function setNetworkUrls(value: BitcoinNetwork) {
    const preset = bitcoinNetworkPresets[value];
    setStacksUrl(preset.stacksUrl);
    setBitcoinUrl(preset.bitcoinUrl);
  }

  useOnMount(() => {
    if (isEditNetworkMode) {
      return;
    }

    setNetworkUrls(getValues('bitcoinNetwork'));
  });

  return (
    <Flex direction="column" gap="space.05">
      <NetworkNameSection />
      <BitcoinApiSection isEditNetworkMode={isEditNetworkMode} setNetworkUrls={setNetworkUrls} />
      <StacksApiSection />
    </Flex>
  );
}
