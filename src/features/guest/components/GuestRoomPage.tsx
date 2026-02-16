import { Badge, Button, Card, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { IconDoorExit } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';

import { MuteMicButton } from '../../calls/components/shared/MuteMicButton';
import { useGuestRoomCall } from '../hooks/useGuestRoomCall';

const statusColors: Record<string, string> = {
  connecting: 'gray',
  joining: 'blue',
  joined: 'green',
  error: 'red',
  left: 'gray',
};

export const GuestRoomPage = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const guestToken = token ?? null;
  const { status, roomId, members, error, isMicMuted, toggleMicMute, leaveRoom } = useGuestRoomCall(guestToken);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'connecting':
        return t('guest.status.connecting');
      case 'joining':
        return t('guest.status.joining');
      case 'joined':
        return t('guest.status.joined');
      case 'left':
        return t('guest.status.left');
      default:
        return t('guest.status.error');
    }
  }, [status, t]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Center mih="100vh" px="md">
      <Card withBorder radius="lg" p="lg" maw={520} w="100%">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={700} size="lg">
              {t('guest.title')}
            </Text>
            <Badge color={statusColors[status] || 'gray'} variant="light">
              {statusLabel}
            </Badge>
          </Group>

          {roomId && (
            <Text size="sm" c="dimmed">
              {t('guest.roomLabel', { id: roomId })}
            </Text>
          )}

          {(status === 'connecting' || status === 'joining') && (
            <Group gap="sm" wrap="nowrap">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                {status === 'connecting' ? t('guest.connecting') : t('guest.joining')}
              </Text>
            </Group>
          )}

          {error && (
            <Text size="sm" c="red" fw={500}>
              {t(error)}
            </Text>
          )}

          {status === 'joined' && (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                {t('rooms.participants', { count: members.length })}
              </Text>
              <Group gap="xs" wrap="nowrap">
                <MuteMicButton isMuted={isMicMuted} onToggle={toggleMicMute} />
                <Button
                  color="red"
                  variant="light"
                  size="md"
                  leftSection={<IconDoorExit size={18} />}
                  onClick={leaveRoom}
                  radius="md"
                >
                  {t('guest.leave')}
                </Button>
              </Group>
            </Stack>
          )}

          {status === 'left' && (
            <Text size="sm" c="dimmed">
              {t('guest.leftHint')}
            </Text>
          )}
        </Stack>
      </Card>
    </Center>
  );
};
