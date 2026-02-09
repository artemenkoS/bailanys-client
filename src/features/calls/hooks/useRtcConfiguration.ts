import { useCallback, useEffect, useRef } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [],
  iceTransportPolicy: 'relay',
};

export const useRtcConfiguration = () => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const configRef = useRef<RTCConfiguration | null>(null);
  const promiseRef = useRef<Promise<RTCConfiguration> | null>(null);

  useEffect(() => {
    configRef.current = null;
    promiseRef.current = null;
  }, [accessToken]);

  const getRtcConfiguration = useCallback(async () => {
    if (configRef.current) return configRef.current;
    if (!accessToken) return DEFAULT_RTC_CONFIGURATION;

    if (!promiseRef.current) {
      promiseRef.current = apiService
        .getIceServers(accessToken)
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
          console.error('[WebRTC] Failed to load ICE servers:', error);
          return DEFAULT_RTC_CONFIGURATION;
        })
        .finally(() => {
          promiseRef.current = null;
        });
    }

    return promiseRef.current;
  }, [accessToken]);

  return { getRtcConfiguration };
};
