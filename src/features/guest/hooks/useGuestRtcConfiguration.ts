import { useCallback, useEffect, useRef } from 'react';

import { apiService } from '../../../services/api.service';

const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [],
  iceTransportPolicy: 'relay',
};

export const useGuestRtcConfiguration = (guestToken: string | null) => {
  const configRef = useRef<RTCConfiguration | null>(null);
  const promiseRef = useRef<Promise<RTCConfiguration> | null>(null);

  useEffect(() => {
    configRef.current = null;
    promiseRef.current = null;
  }, [guestToken]);

  const getRtcConfiguration = useCallback(async () => {
    if (configRef.current) return configRef.current;
    if (!guestToken) return DEFAULT_RTC_CONFIGURATION;

    if (!promiseRef.current) {
      promiseRef.current = apiService
        .getGuestIceServers(guestToken)
        .then((response) => {
          const iceServers = Array.isArray(response.iceServers) ? response.iceServers : [];
          const config: RTCConfiguration = {
            iceServers,
            iceTransportPolicy: 'relay',
          };
          if (iceServers.length > 0) {
            configRef.current = config;
          }
          return config;
        })
        .catch((error) => {
          console.error('[WebRTC] Failed to load guest ICE servers:', error);
          return DEFAULT_RTC_CONFIGURATION;
        })
        .finally(() => {
          promiseRef.current = null;
        });
    }

    return promiseRef.current;
  }, [guestToken]);

  return { getRtcConfiguration };
};
