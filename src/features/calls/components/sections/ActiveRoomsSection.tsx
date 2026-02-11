import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';

import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import { useRoomJoinHandler } from '../../hooks/useRoomJoinHandler';
import { useRooms } from '../../hooks/useRooms';
import { RoomsListSection } from './RoomsListSection';

export const ActiveRoomsSection = () => {
  const { t } = useTranslation();
  const { data: roomsData, isLoading, isError } = useRooms();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const onJoin = useRoomJoinHandler();

  const isInRoom = Boolean(roomId);
  const isActionDisabled = callStatus !== 'idle' || roomStatus === 'joining' || isInRoom;

  return (
    <RoomsListSection
      title={t('rooms.activeRoomsTitle')}
      rooms={roomsData?.rooms ?? []}
      isLoading={isLoading}
      isError={isError}
      emptyText={t('rooms.empty')}
      isMobile={isMobile}
      isActionDisabled={isActionDisabled}
      onJoin={onJoin}
    />
  );
};
