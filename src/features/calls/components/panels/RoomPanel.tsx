import { Badge, Card, Container, Divider, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUsers } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../../../stores/authStore';
import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import type { CreateRoomPayload } from '../../../../types/rooms';
import { useCreateRoom } from '../../hooks/useCreateRoom';
import { useUpdateRoomAvatar } from '../../hooks/useUpdateRoomAvatar';
import { useRoomUiStore } from '../../stores/roomUiStore';
import { RoomPasswordModal } from '../modals/RoomPasswordModal';
import { ActiveRoomsSection } from '../sections/ActiveRoomsSection';
import { MyRoomsSection } from '../sections/MyRoomsSection';
import { RoomCreateSection } from '../sections/RoomCreateSection';
import { RoomCurrentSection } from '../sections/RoomCurrentSection';

export const RoomPanel = () => {
  const { t } = useTranslation();
  const accessToken = useAuthStore((state) => state.session?.access_token || '');
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const roomError = useRoomCallStore((state) => state.error);
  const createRoom = useRoomCallStore((state) => state.createRoom);
  const passwordModalOpen = useRoomUiStore((state) => state.passwordModalOpen);
  const updateRoomAvatarMutation = useUpdateRoomAvatar();
  const updateRoomAvatarAsync = updateRoomAvatarMutation.mutateAsync;
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRoomAvatar, setPendingRoomAvatar] = useState<{
    roomId: string;
    file: File;
  } | null>(null);

  const isInRoom = Boolean(roomId);
  const isRoomJoining = roomStatus === 'joining';

  const notifyError = useCallback(
    (messageKey: string) => {
      notifications.show({
        title: t('notifications.error'),
        message: t(messageKey),
      });
    },
    [t]
  );

  const createRoomWithValidation = useCreateRoom({
    callStatus,
    isInRoom,
    notifyError,
    createRoom,
  });

  const isPanelDisabled = callStatus !== 'idle' || isRoomJoining;
  const isActionDisabled = Boolean(isPanelDisabled || isInRoom);

  const panelError = passwordModalOpen ? actionError : (roomError ?? actionError);

  const handleCreateRoom = useCallback(
    (payload: CreateRoomPayload) => {
      setActionError(null);
      const createdRoomId = createRoomWithValidation(payload);
      if (payload.avatarFile && createdRoomId) {
        setPendingRoomAvatar({
          roomId: createdRoomId,
          file: payload.avatarFile,
        });
      }
    },
    [createRoomWithValidation]
  );

  useEffect(() => {
    if (!pendingRoomAvatar || !roomId || roomId !== pendingRoomAvatar.roomId) {
      return;
    }
    if (!accessToken) return;

    let cancelled = false;
    const upload = async () => {
      try {
        await updateRoomAvatarAsync({
          roomId: pendingRoomAvatar.roomId,
          file: pendingRoomAvatar.file,
        });
      } catch (err) {
        console.error('Upload room avatar failed:', err);
        if (!cancelled) {
          setActionError('rooms.errors.avatarFailed');
        }
      } finally {
        if (!cancelled) {
          setPendingRoomAvatar(null);
        }
      }
    };

    upload();
    return () => {
      cancelled = true;
    };
  }, [pendingRoomAvatar, roomId, accessToken, updateRoomAvatarAsync]);

  useEffect(() => {
    if (pendingRoomAvatar && roomError && !roomId) {
      setPendingRoomAvatar(null);
    }
  }, [pendingRoomAvatar, roomError, roomId]);

  return (
    <Container size="xl" px={{ base: 'xs', sm: 'md' }}>
      <Card withBorder radius="lg" p="md" mt="md" id="room-panel">
        <RoomPasswordModal />
        <Group justify="space-between" mb="sm" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <IconUsers size={18} color="var(--mantine-color-indigo-6)" />
            <Text fw={700} size="md">
              {t('rooms.title')}
            </Text>
          </Group>
          {isInRoom && roomId && (
            <Badge color="green" variant="light">
              {t('rooms.activeBadge')}
            </Badge>
          )}
        </Group>

        <Stack gap="sm">
          {!isInRoom ? (
            <RoomCreateSection disabled={isActionDisabled} onCreate={handleCreateRoom} />
          ) : (
            <RoomCurrentSection />
          )}
          {panelError && (
            <Text size="sm" c="red" fw={500}>
              {t(panelError)}
            </Text>
          )}
        </Stack>

        <Divider my="sm" />

        <ActiveRoomsSection />

        <Divider my="sm" />

        <MyRoomsSection />
      </Card>
    </Container>
  );
};
