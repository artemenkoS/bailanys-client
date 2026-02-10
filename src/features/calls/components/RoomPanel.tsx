import { Badge, Card, Container, Divider, Group, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconUsers } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../../stores/authStore';
import type { CreateRoomPayload, RoomOwnerSummary, RoomSummary } from '../../../types/rooms';
import { useOnlineUsers } from '../../contacts/hooks/useOnlineUsers';
import { useDeleteRoom } from '../hooks/useDeleteRoom';
import { useMyRooms } from '../hooks/useMyRooms';
import { useRemoveRoomAvatar } from '../hooks/useRemoveRoomAvatar';
import { useRooms } from '../hooks/useRooms';
import { useUpdateRoomAvatar } from '../hooks/useUpdateRoomAvatar';
import { RoomCreateSection } from './RoomCreateSection';
import { RoomCurrentSection } from './RoomCurrentSection';
import { RoomDeleteConfirmModal } from './RoomDeleteConfirmModal';
import { RoomPasswordModal } from './RoomPasswordModal';
import { RoomsListSection } from './RoomsListSection';

interface RoomPanelProps {
  onJoinRoom: (roomId: string, password?: string) => void;
  onCreateRoom: (payload: CreateRoomPayload) => string | null;
  onLeaveRoom: () => void;
  isInRoom: boolean;
  roomId: string | null;
  members: string[];
  memberVolumes: Record<string, number>;
  onMemberVolumeChange: (id: string, volume: number) => void;
  isMicMuted: boolean;
  onToggleMute: () => void;
  error?: string | null;
  isDisabled?: boolean;
  currentUserId?: string | null;
}

export const RoomPanel = ({
  onJoinRoom,
  onCreateRoom,
  onLeaveRoom,
  isInRoom,
  roomId,
  members,
  memberVolumes,
  onMemberVolumeChange,
  isMicMuted,
  onToggleMute,
  error,
  isDisabled,
  currentUserId,
}: RoomPanelProps) => {
  const { t } = useTranslation();
  const { data } = useOnlineUsers();
  const { data: roomsData, isLoading: roomsLoading, isError: roomsError } = useRooms();
  const { data: myRoomsData, isLoading: myRoomsLoading, isError: myRoomsError } = useMyRooms();
  const accessToken = useAuthStore((state) => state.session?.access_token || '');
  const { deleteRoomAsync } = useDeleteRoom();
  const updateRoomAvatarMutation = useUpdateRoomAvatar();
  const removeRoomAvatarMutation = useRemoveRoomAvatar();
  const updateRoomAvatarAsync = updateRoomAvatarMutation.mutateAsync;
  const removeRoomAvatarAsync = removeRoomAvatarMutation.mutateAsync;
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordRoom, setPasswordRoom] = useState<RoomSummary | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [avatarRoomId, setAvatarRoomId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RoomOwnerSummary | null>(null);
  const [pendingRoomAvatar, setPendingRoomAvatar] = useState<{
    roomId: string;
    file: File;
  } | null>(null);

  const rooms = useMemo(() => roomsData?.rooms ?? [], [roomsData?.rooms]);

  const myRooms = useMemo(() => myRoomsData?.rooms ?? [], [myRoomsData?.rooms]);

  const isActionDisabled = Boolean(isDisabled || isInRoom);

  const currentRoom = useMemo(() => {
    if (!roomId) return null;
    return rooms.find((room) => room.id === roomId) ?? myRooms.find((room) => room.id === roomId) ?? null;
  }, [rooms, myRooms, roomId]);

  const currentRoomLabel = useMemo(() => {
    if (!roomId) return '';
    return currentRoom?.name ?? roomId;
  }, [currentRoom, roomId]);
  const currentRoomAvatarUrl = currentRoom?.avatarUrl ?? null;
  const panelError = passwordModalOpen ? actionError : (error ?? actionError);

  const closePasswordModal = useCallback(() => {
    setPasswordModalOpen(false);
    setPasswordRoom(null);
    setPasswordInput('');
    setPasswordError(null);
  }, []);

  useEffect(() => {
    if (isInRoom) {
      closePasswordModal();
    }
  }, [isInRoom, closePasswordModal]);

  const profileById = useMemo(() => {
    const map = new Map<string, { displayName: string }>();
    for (const user of data?.users ?? []) {
      const displayName = user.display_name || user.username || user.id.slice(0, 8);
      map.set(user.id, { displayName });
    }
    return map;
  }, [data]);

  const resolveMemberLabel = (id: string) => {
    if (currentUserId && id === currentUserId) return t('rooms.you');
    return profileById.get(id)?.displayName ?? id.slice(0, 8);
  };

  const handleCreateRoom = useCallback(
    (payload: CreateRoomPayload) => {
      setActionError(null);
      const createdRoomId = onCreateRoom(payload);
      if (payload.avatarFile && createdRoomId) {
        setPendingRoomAvatar({
          roomId: createdRoomId,
          file: payload.avatarFile,
        });
      }
    },
    [onCreateRoom]
  );

  const handleJoinRoom = (room: RoomSummary) => {
    if (room.isPrivate) {
      setPasswordRoom(room);
      setPasswordInput('');
      setPasswordError(null);
      setPasswordModalOpen(true);
      return;
    }
    setActionError(null);
    onJoinRoom(room.id);
  };

  const handleConfirmPassword = () => {
    if (!passwordRoom) return;
    const password = passwordInput.trim();
    if (!password) {
      setPasswordError('rooms.errors.passwordRequired');
      return;
    }
    setPasswordError(null);
    onJoinRoom(passwordRoom.id, password);
  };

  const handleDeleteRoom = async (room: RoomOwnerSummary) => {
    setDeleteCandidate(room);
  };

  const handleUpdateRoomAvatar = useCallback(
    async (room: RoomOwnerSummary, file: File) => {
      if (!accessToken) return;
      setActionError(null);
      setAvatarRoomId(room.id);
      try {
        await updateRoomAvatarAsync({ roomId: room.id, file });
      } catch (err) {
        console.error('Update room avatar failed:', err);
        setActionError('rooms.errors.avatarFailed');
      } finally {
        setAvatarRoomId(null);
      }
    },
    [accessToken, updateRoomAvatarAsync]
  );

  const handleRemoveRoomAvatar = useCallback(
    async (room: RoomOwnerSummary) => {
      if (!accessToken) return;
      setActionError(null);
      setAvatarRoomId(room.id);
      try {
        await removeRoomAvatarAsync({ roomId: room.id });
      } catch (err) {
        console.error('Remove room avatar failed:', err);
        setActionError('rooms.errors.avatarFailed');
      } finally {
        setAvatarRoomId(null);
      }
    },
    [accessToken, removeRoomAvatarAsync]
  );

  const closeDeleteModal = () => {
    setDeleteCandidate(null);
  };

  const confirmDeleteRoom = async () => {
    if (!accessToken || !deleteCandidate) return;
    setDeleteRoomId(deleteCandidate.id);
    const result = await deleteRoomAsync(deleteCandidate.id);
    if (result.ok) {
      setDeleteCandidate(null);
    } else {
      setActionError(result.errorKey);
    }
    setDeleteRoomId(null);
  };

  useEffect(() => {
    if (!pendingRoomAvatar || !roomId || roomId !== pendingRoomAvatar.roomId) {
      return;
    }
    if (!accessToken) return;

    let cancelled = false;
    const upload = async () => {
      setAvatarRoomId(pendingRoomAvatar.roomId);
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
          setAvatarRoomId(null);
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
    if (pendingRoomAvatar && error && !roomId) {
      setPendingRoomAvatar(null);
    }
  }, [pendingRoomAvatar, error, roomId]);

  return (
    <Container size="xl" px={{ base: 'xs', sm: 'md' }}>
      <Card withBorder radius="lg" p="md" mt="md" id="room-panel">
        <RoomPasswordModal
          opened={passwordModalOpen && !isInRoom}
          roomName={passwordRoom?.name}
          password={passwordInput}
          passwordErrorKey={passwordError}
          serverErrorKey={passwordModalOpen ? error : null}
          onPasswordChange={setPasswordInput}
          onCancel={closePasswordModal}
          onSubmit={handleConfirmPassword}
          disabled={isDisabled}
        />
        <RoomDeleteConfirmModal
          opened={Boolean(deleteCandidate)}
          roomName={deleteCandidate?.name}
          onCancel={closeDeleteModal}
          onConfirm={confirmDeleteRoom}
          loading={Boolean(deleteRoomId)}
        />

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
            <RoomCurrentSection
              roomLabel={currentRoomLabel || roomId || ''}
              roomAvatarUrl={currentRoomAvatarUrl}
              members={members}
              memberVolumes={memberVolumes}
              onMemberVolumeChange={onMemberVolumeChange}
              currentUserId={currentUserId}
              isMicMuted={isMicMuted}
              onToggleMute={onToggleMute}
              onLeaveRoom={onLeaveRoom}
              resolveMemberLabel={resolveMemberLabel}
            />
          )}
          {panelError && (
            <Text size="sm" c="red" fw={500}>
              {t(panelError)}
            </Text>
          )}
        </Stack>

        <Divider my="sm" />

        <RoomsListSection
          title={t('rooms.activeRoomsTitle')}
          rooms={rooms}
          isLoading={roomsLoading}
          isError={roomsError}
          emptyText={t('rooms.empty')}
          isMobile={isMobile}
          isActionDisabled={isActionDisabled}
          onJoin={handleJoinRoom}
        />

        <Divider my="sm" />

        <RoomsListSection
          title={t('rooms.myRoomsTitle')}
          rooms={myRooms}
          isLoading={myRoomsLoading}
          isError={myRoomsError}
          emptyText={t('rooms.emptyMine')}
          isMobile={isMobile}
          isActionDisabled={isActionDisabled}
          onJoin={handleJoinRoom}
          onDelete={handleDeleteRoom}
          deleteRoomId={deleteRoomId}
          onAvatarChange={handleUpdateRoomAvatar}
          onAvatarRemove={handleRemoveRoomAvatar}
          avatarUpdatingRoomId={avatarRoomId}
          showInactiveBadge
        />
      </Card>
    </Container>
  );
};
