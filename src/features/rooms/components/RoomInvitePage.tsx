import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import { useCallStore } from '../../../stores/callStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import { useRoomCallManager } from '../../calls/hooks/useRoomCallManager';

export const RoomInvitePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();
  const accessToken = useAuthStore((state) => state.session?.access_token ?? '');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const callStatus = useCallStore((state) => state.status);
  const currentRoomId = useRoomCallStore((state) => state.roomId);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomError = useRoomCallStore((state) => state.error);
  const joinRoom = useRoomCallStore((state) => state.joinRoom);
  const [status, setStatus] = useState<'idle' | 'accepting' | 'joining' | 'error'>('idle');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useRoomCallManager();

  useEffect(() => {
    if (!token) {
      setErrorKey('rooms.inviteInvalid');
      return;
    }
    if (!isAuthenticated) return;

    let cancelled = false;

    const acceptInvite = async () => {
      setStatus('accepting');
      setErrorKey(null);
      try {
        const response = await apiService.acceptRoomInviteLink(accessToken, { token });
        const roomId = response.room?.id;
        if (!roomId) throw new Error('Room missing');

        if (callStatus !== 'idle' || currentRoomId) {
          if (!cancelled) {
            setStatus('error');
            setErrorKey('rooms.errors.leaveCallToJoin');
          }
          return;
        }

        joinRoom(roomId);
        setStatus('joining');
        setShouldRedirect(true);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorKey('rooms.inviteInvalid');
        }
      }
    };

    acceptInvite();

    return () => {
      cancelled = true;
    };
  }, [accessToken, callStatus, currentRoomId, isAuthenticated, joinRoom, navigate, token]);

  useEffect(() => {
    if (shouldRedirect && roomStatus === 'joined') {
      navigate('/', { replace: true });
    }
  }, [navigate, roomStatus, shouldRedirect]);

  useEffect(() => {
    if (shouldRedirect && roomError) {
      setStatus('error');
      setErrorKey(roomError);
      setShouldRedirect(false);
    }
  }, [roomError, shouldRedirect]);

  if (!isAuthenticated) {
    return (
      <Center mih="100vh">
        <Stack gap="sm" align="center">
          <Text size="sm">{t('rooms.inviteAuthRequired')}</Text>
          <Button variant="light" onClick={() => navigate('/login', { replace: true })}>
            {t('auth.loginButton')}
          </Button>
        </Stack>
      </Center>
    );
  }

  if (status === 'accepting' || status === 'joining') {
    return (
      <Center mih="100vh">
        <Stack gap="sm" align="center">
          <Loader size="sm" />
          <Text size="sm">{status === 'joining' ? t('rooms.callJoining') : t('rooms.inviteAccepting')}</Text>
        </Stack>
      </Center>
    );
  }

  if (errorKey) {
    return (
      <Center mih="100vh">
        <Stack gap="sm" align="center">
          <Text size="sm" c="red">
            {t(errorKey)}
          </Text>
          <Button variant="light" onClick={() => navigate('/', { replace: true })}>
            {t('common.back')}
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Center mih="100vh">
      <Loader size="sm" />
    </Center>
  );
};
