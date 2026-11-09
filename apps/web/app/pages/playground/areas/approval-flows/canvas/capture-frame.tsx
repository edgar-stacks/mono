import { Flex, styled } from 'leather-styles/jsx';

import { extensionCaptureFor } from '../captures/extension-captures';
import { ExtensionFrame } from './extension-frame';

interface CaptureFrameProps {
  screenId: string;
}

export function CaptureFrame({ screenId }: CaptureFrameProps) {
  const capture = extensionCaptureFor(screenId);
  return (
    <ExtensionFrame label="Current extension">
      {capture ? (
        <styled.img
          src={capture.src}
          alt={capture.caption}
          width="100%"
          height="100%"
          objectFit="cover"
          objectPosition="top"
        />
      ) : (
        <Flex
          height="100%"
          alignItems="center"
          justifyContent="center"
          p="space.06"
          textAlign="center"
          bg="ink.background-secondary"
        >
          <styled.span textStyle="body.02" color="ink.text-subdued">
            No capture of the current extension for this request.
          </styled.span>
        </Flex>
      )}
    </ExtensionFrame>
  );
}
