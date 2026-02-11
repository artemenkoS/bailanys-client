import { Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../../../stores/authStore';
import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import type { RoomOwnerSummary } from '../../../../types/rooms';
import { useDeleteRoom } from '../../hooks/useDeleteRoom';
import { useMyRooms } from '../../hooks/useMyRooms';
import { useRemoveRoomAvatar } from '../../hooks/useRemoveRoomAvatar';
import { useRoomJoinHandler } from '../../hooks/useRoomJoinHandler';
import { useUpdateRoomAvatar } from '../../hooks/useUpdateRoomAvatar';
import { RoomDeleteConfirmModal } from '../modals/RoomDeleteConfirmModal';
import { RoomsListSection } from './RoomsListSection';

export const MyRoomsSection = () => {
  const { t } = useTranslation();
  const { data: myRoomsData, isLoading, isError } = useMyRooms();
  const accessToken = useAuthStore((state) => state.session?.access_token || '');
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const onJoin = useRoomJoinHandler();
  const { deleteRoomAsync } = useDeleteRoom();
  const updateRoomAvatarMutation = useUpdateRoomAvatar();
  const removeRoomAvatarMutation = useRemoveRoomAvatar();
  const updateRoomAvatarAsync = updateRoomAvatarMutation.mutateAsync;
  const removeRoomAvatarAsync = removeRoomAvatarMutation.mutateAsync;
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [avatarRoomId, setAvatarRoomId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RoomOwnerSummary | null>(null);

  const isInRoom = Boolean(roomId);
  const isActionDisabled = callStatus !== 'idle' || roomStatus === 'joining' || isInRoom;

  const handleDeleteRoom = (room: RoomOwnerSummary) => {
    setDeleteCandidate(room);
  };

  const closeDeleteModal = () => {
    setDeleteCandidate(null);
  };

  const confirmDeleteRoom = async () => {
    if (!accessToken || !deleteCandidate) return;
    setDeleteRoomId(deleteCandidate.id);
    const result = await deleteRoomAsync(deleteCandidate.id);
    if (result.ok) {
      setDeleteCandidate(null);
      setActionError(null);
    } else {
      setActionError(result.errorKey);
    }
    setDeleteRoomId(null);
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

  return (
    <>
      <RoomDeleteConfirmModal
        opened={Boolean(deleteCandidate)}
        roomName={deleteCandidate?.name}
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteRoom}
        loading={Boolean(deleteRoomId)}
      />
      <RoomsListSection
        title={t('rooms.myRoomsTitle')}
        rooms={myRoomsData?.rooms ?? []}
        isLoading={isLoading}
        isError={isError}
        emptyText={t('rooms.emptyMine')}
        isMobile={isMobile}
        isActionDisabled={isActionDisabled}
        onJoin={onJoin}
        onDelete={handleDeleteRoom}
        deleteRoomId={deleteRoomId}
        onAvatarChange={handleUpdateRoomAvatar}
        onAvatarRemove={handleRemoveRoomAvatar}
        avatarUpdatingRoomId={avatarRoomId}
        showInactiveBadge
      />
      {actionError && (
        <Text size="sm" c="red" fw={500} mt="xs">
          {t(actionError)}
        </Text>
      )}
    </>
  );
};
