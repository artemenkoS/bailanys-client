import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useCallStore } from '../../../stores/callStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import type { RoomSummary } from '../../../types/rooms';
import { useRoomUiStore } from '../stores/roomUiStore';

export const useRoomJoinHandler = () => {
  const { t } = useTranslation();
  const callStatus = useCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const joinRoom = useRoomCallStore((state) => state.joinRoom);
  const openPasswordModal = useRoomUiStore((state) => state.openPasswordModal);

  return useCallback(
    (room: RoomSummary) => {
      if (room.isPrivate && !('role' in room)) {
        openPasswordModal(room);
        return;
      }
      if (callStatus !== 'idle') {
        notifications.show({
          title: t('notifications.error'),
          message: t('rooms.errors.leaveCallToJoin'),
        });
        return;
      }
      if (roomId) return;
      joinRoom(room.id);
    },
    [callStatus, joinRoom, openPasswordModal, roomId, t]
  );
};
