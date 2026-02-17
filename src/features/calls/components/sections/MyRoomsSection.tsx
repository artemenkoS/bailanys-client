import { Group, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { apiService } from '../../../../services/api.service';
import { useAuthStore } from '../../../../stores/authStore';
import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import type { RoomsListActions } from '../../../../stores/roomsListStore';
import { useRoomsListStore } from '../../../../stores/roomsListStore';
import type { RoomMemberSummary, RoomSummary } from '../../../../types/rooms';
import { RoomInviteUsersModal } from '../../../rooms/components/RoomInviteUsersModal';
import { RoomMembersModal } from '../../../rooms/components/RoomMembersModal';
import { useUpdateRoomMemberRole } from '../../../rooms/hooks/useUpdateRoomMemberRole';
import { useDeleteRoom } from '../../hooks/useDeleteRoom';
import { useMyRooms } from '../../hooks/useMyRooms';
import { useRemoveRoomAvatar } from '../../hooks/useRemoveRoomAvatar';
import { useRoomJoinHandler } from '../../hooks/useRoomJoinHandler';
import { useUpdateRoomAvatar } from '../../hooks/useUpdateRoomAvatar';
import { RoomDeleteConfirmModal } from '../modals/RoomDeleteConfirmModal';
import { NotificationCopyButton } from '../shared/NotificationCopyButton';
import { RoomsListSection } from './RoomsListSection';

export const MyRoomsSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: myRoomsData, isLoading, isError } = useMyRooms();
  const accessToken = useAuthStore((state) => state.session?.access_token || '');
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const onJoin = useRoomJoinHandler();
  const { deleteRoomAsync } = useDeleteRoom();
  const updateRoleMutation = useUpdateRoomMemberRole();
  const updateRoomAvatarMutation = useUpdateRoomAvatar();
  const removeRoomAvatarMutation = useRemoveRoomAvatar();
  const updateRoomAvatarAsync = updateRoomAvatarMutation.mutateAsync;
  const removeRoomAvatarAsync = removeRoomAvatarMutation.mutateAsync;
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [avatarRoomId, setAvatarRoomId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RoomMemberSummary | null>(null);
  const [manageRoom, setManageRoom] = useState<RoomMemberSummary | null>(null);
  const [inviteLinkRoomId, setInviteLinkRoomId] = useState<string | null>(null);
  const [inviteUsersRoom, setInviteUsersRoom] = useState<RoomMemberSummary | null>(null);
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const setUi = useRoomsListStore((state) => state.setUi);
  const setActions = useRoomsListStore((state) => state.setActions);

  const isInRoom = Boolean(roomId);
  const isActionDisabled = callStatus !== 'idle' || roomStatus === 'joining' || isInRoom;

  const handleDeleteRoom = useCallback((room: RoomMemberSummary) => {
    setDeleteCandidate(room);
  }, []);

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
    async (room: RoomMemberSummary, file: File) => {
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
    async (room: RoomMemberSummary) => {
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

  const handleInviteLink = useCallback(
    async (room: RoomMemberSummary) => {
      const freshToken = useAuthStore.getState().session?.access_token ?? '';
      if (!freshToken || inviteLinkRoomId) {
        if (!freshToken) {
          notifications.show({
            title: t('notifications.error'),
            message: t('notifications.loginFailed'),
            color: 'red',
          });
        }
        return;
      }
      setInviteLinkRoomId(room.id);
      try {
        const response = await apiService.createRoomInviteLink(freshToken, { roomId: room.id });
        const inviteToken = response.token;
        if (!inviteToken) throw new Error('Invite token missing');
        const url = `${window.location.origin}/invite/${inviteToken}`;

        let copied = false;
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(url);
            copied = true;
          } catch {
            copied = false;
          }
        }

        const copyInviteLink = async () => {
          if (!navigator.clipboard?.writeText) return;
          try {
            await navigator.clipboard.writeText(url);
            notifications.show({
              title: t('notifications.success'),
              message: t('rooms.inviteLinkCopied'),
              color: 'green',
            });
          } catch {
            // Ignore clipboard errors, user can copy manually.
          }
        };

        const inviteTitle = copied ? (
          t('notifications.success')
        ) : (
          <Group align="center" gap="xs" justify="space-between" style={{ width: '100%' }} wrap="nowrap">
            <Text size="sm" fw={600}>
              {t('notifications.success')}
            </Text>
            <NotificationCopyButton onClick={copyInviteLink} ariaLabel={t('rooms.inviteLinkCopy')} />
          </Group>
        );

        const inviteMessage = copied ? t('rooms.inviteLinkCopied') : t('rooms.inviteLinkReady', { url });

        notifications.show({
          title: inviteTitle,
          message: inviteMessage,
          color: copied ? 'green' : 'blue',
        });
      } catch (err) {
        console.error('Create invite link failed:', err);
        notifications.show({
          title: t('notifications.error'),
          message: t('rooms.inviteLinkFailed'),
          color: 'red',
        });
      } finally {
        setInviteLinkRoomId(null);
      }
    },
    [inviteLinkRoomId, t]
  );

  const handleLeaveRoom = useCallback(
    async (room: RoomMemberSummary) => {
      if (!currentUserId) {
        notifications.show({
          title: t('notifications.error'),
          message: t('notifications.loginFailed'),
          color: 'red',
        });
        return;
      }
      try {
        await updateRoleMutation.mutateAsync({
          roomId: room.id,
          userId: currentUserId,
          action: 'leave',
        });
      } catch (err) {
        console.error('Leave room failed:', err);
        notifications.show({
          title: t('notifications.error'),
          message: t('rooms.leaveRoomFailed'),
          color: 'red',
        });
      }
    },
    [currentUserId, t, updateRoleMutation]
  );

  const actions = useMemo<Partial<RoomsListActions>>(
    () => ({
      onJoin,
      onChat: (room: RoomSummary) => navigate(`/rooms/${room.id}/chat`),
      onDelete: handleDeleteRoom,
      onInviteLink: handleInviteLink,
      onInviteUsers: (room: RoomMemberSummary) => setInviteUsersRoom(room),
      onManageUsers: (room: RoomMemberSummary) => setManageRoom(room),
      onLeave: handleLeaveRoom,
      onAvatarChange: handleUpdateRoomAvatar,
      onAvatarRemove: handleRemoveRoomAvatar,
    }),
    [
      handleDeleteRoom,
      handleInviteLink,
      handleLeaveRoom,
      handleRemoveRoomAvatar,
      handleUpdateRoomAvatar,
      navigate,
      onJoin,
    ]
  );

  useEffect(() => {
    setActions('mine', actions);
  }, [actions, setActions]);

  useEffect(() => {
    setUi('mine', {
      isMobile,
      isActionDisabled,
      deleteRoomId,
      avatarUpdatingRoomId: avatarRoomId,
      showInactiveBadge: true,
    });
  }, [avatarRoomId, deleteRoomId, isActionDisabled, isMobile, setUi]);

  return (
    <>
      <RoomDeleteConfirmModal
        opened={Boolean(deleteCandidate)}
        roomName={deleteCandidate?.name}
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteRoom}
        loading={Boolean(deleteRoomId)}
      />
      <RoomMembersModal opened={Boolean(manageRoom)} room={manageRoom} onClose={() => setManageRoom(null)} />
      <RoomInviteUsersModal
        opened={Boolean(inviteUsersRoom)}
        room={inviteUsersRoom}
        onClose={() => setInviteUsersRoom(null)}
      />
      <RoomsListSection
        listKey="mine"
        title={t('rooms.myRoomsTitle')}
        rooms={myRoomsData?.rooms ?? []}
        isLoading={isLoading}
        isError={isError}
        emptyText={t('rooms.emptyMine')}
      />
      {actionError && (
        <Text size="sm" c="red" fw={500} mt="xs">
          {t(actionError)}
        </Text>
      )}
    </>
  );
};
