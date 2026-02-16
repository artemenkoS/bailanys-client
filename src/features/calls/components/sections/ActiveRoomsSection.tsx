import { useMediaQuery } from '@mantine/hooks';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import { useRoomsListStore } from '../../../../stores/roomsListStore';
import { useRoomJoinHandler } from '../../hooks/useRoomJoinHandler';
import { useRooms } from '../../hooks/useRooms';
import { RoomsListSection } from './RoomsListSection';

export const ActiveRoomsSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: roomsData, isLoading, isError } = useRooms();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const onJoin = useRoomJoinHandler();
  const setUi = useRoomsListStore((state) => state.setUi);
  const setActions = useRoomsListStore((state) => state.setActions);

  const isInRoom = Boolean(roomId);
  const isActionDisabled = callStatus !== 'idle' || roomStatus === 'joining' || isInRoom;

  useEffect(() => {
    setUi('active', {
      isMobile,
      isActionDisabled,
      showInactiveBadge: false,
      deleteRoomId: null,
      avatarUpdatingRoomId: null,
    });
  }, [isActionDisabled, isMobile, setUi]);

  useEffect(() => {
    setActions('active', {
      onJoin,
      onChat: (room) => navigate(`/rooms/${room.id}/chat`),
    });
  }, [navigate, onJoin, setActions]);

  return (
    <RoomsListSection
      listKey="active"
      title={t('rooms.activeRoomsTitle')}
      rooms={roomsData?.rooms ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyText={t('rooms.empty')}
    />
  );
};
