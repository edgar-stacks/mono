import { useEffect, useState } from 'react';

import { Flex } from 'leather-styles/jsx';

const lettermarkPath =
  'M15.462 9.378c2.134-.34 5.221-2.656 5.221-4.46 0-.545-.427-.919-1.05-.919-1.183 0-3.186 1.838-4.171 5.379ZM5.578 18.33c-2.792 0-3.021 2.86-.23 2.86 1.248 0 2.758-.511 3.546-1.43-1.149-1.022-2.101-1.43-3.316-1.43Zm17.765-1.226c.164 4.8-2.2 7.49-6.206 7.49-2.365 0-3.547-.92-6.075-2.622-1.314 1.498-3.81 2.622-5.878 2.622-7.126 0-6.83-9.362.427-9.362 1.51 0 2.79.409 4.433 1.464l1.083-3.915c-4.466-1.26-6.699-4.8-4.498-9.872h3.546c-1.97 3.37-.624 6.161 1.872 6.468C13.393 4.442 16.283.595 20.125.595 22.292.595 24 2.059 24 4.714c0 4.255-5.386 7.727-9.457 8.068l-1.675 6.094c1.904 2.28 7.191 4.493 7.191-1.77h3.284Z';

export const launchDrawMs = 560;

export function JourneyLaunchMark() {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Flex height="100%" alignItems="center" justifyContent="center" color="ink.text-primary">
      <svg width="72" height="75" viewBox="-1 -1 26 27" fill="none" aria-hidden>
        <path
          d={lettermarkPath}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={0.6}
          strokeDasharray={1}
          fill="currentColor"
          style={{
            strokeDashoffset: drawn ? 0 : 1,
            fillOpacity: drawn ? 1 : 0,
            transition: `stroke-dashoffset ${launchDrawMs}ms ease-in-out, fill-opacity 200ms ease-out ${launchDrawMs - 120}ms`,
          }}
        />
      </svg>
    </Flex>
  );
}
