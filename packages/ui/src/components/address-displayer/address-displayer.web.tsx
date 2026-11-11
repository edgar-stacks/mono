import { Flex, type FlexProps, styled } from 'leather-styles/jsx';
import { type SystemStyleObject } from 'leather-styles/types';

import { isEven } from '@leather.io/utils';

import { type AddressDisplayerBaseProps } from './address-displayer.types.shared';
import { groupByFour } from './address-displayer.utils.shared';

export type AddressDisplayerProps = AddressDisplayerBaseProps &
  FlexProps & { textStyle?: SystemStyleObject['textStyle'] };

export function AddressDisplayer({
  address,
  textStyle = 'address',
  ...props
}: AddressDisplayerProps) {
  return (
    <Flex direction="row" columnGap="1ch" flexWrap="wrap" {...props}>
      {groupByFour(address).map((letterGroup, index) => (
        <styled.span
          key={index}
          color={isEven(index) ? 'ink.text-primary' : 'ink.text-subdued'}
          textStyle={textStyle}
        >
          {letterGroup}
        </styled.span>
      ))}
    </Flex>
  );
}
