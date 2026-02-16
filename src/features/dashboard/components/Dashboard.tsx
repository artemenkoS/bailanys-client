import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardNavbar } from '../../../components/DashboardNavbar';
import { Header } from '../../../components/Header';
import { useCallStore } from '../../../stores/callStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import type { Profile } from '../../../types/auth';
import { useAuth } from '../../auth/hooks/useAuth';
import { CallHistory } from '../../calls/components/history/CallHistory';
import { CallOverlay } from '../../calls/components/overlays/CallOverlay';
import { RoomPanel } from '../../calls/components/panels/RoomPanel';
import { useCallHistory } from '../../calls/hooks/useCallHistory';
import { useCallManager } from '../../calls/hooks/useCallManager';
import { useRoomCallManager } from '../../calls/hooks/useRoomCallManager';
import { ChatScreen } from '../../chat/components/ChatScreen';
import { RoomChatScreen } from '../../chat/components/RoomChatScreen';
import { ProfileEditModal } from '../../profile/components/ProfileEditModal';
import styles from './Dashboard.module.css';

export const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { peerId, roomId: chatRoomId } = useParams();
  const [opened, { toggle }] = useDisclosure();
  const [profileOpened, { open: openProfile, close: closeProfile }] = useDisclosure(false);
  const { data: callHistoryData, isLoading: isCallHistoryLoading, isError: isCallHistoryError } = useCallHistory();

  useRoomCallManager();
  const roomId = useRoomCallStore((state) => state.roomId);
  const leaveRoom = useRoomCallStore((state) => state.leaveRoom);
  const isInRoom = Boolean(roomId);

  const notifyError = useCallback(
    (messageKey: string) => {
      notifications.show({
        title: t('notifications.error'),
        message: t(messageKey),
      });
    },
    [t]
  );

  useCallManager({
    isCallBlocked: isInRoom,
    onBlockedCall: () => notifyError('rooms.errors.leaveRoomToCall'),
  });
  const startCall = useCallStore((state) => state.startCall);
  const cleanup = useCallStore((state) => state.cleanup);

  const handleStartCall = useCallback(
    (targetId: string, callType: 'audio' | 'video') => {
      if (isInRoom) {
        notifyError('rooms.errors.leaveRoomToCall');
        return;
      }
      startCall(targetId, callType);
    },
    [isInRoom, notifyError, startCall]
  );

  const handleLogout = () => {
    leaveRoom();
    cleanup();
    logout();
    navigate('/login');
  };

  const handleOpenChat = (peer: Profile) => {
    navigate(`/chat/${peer.id}`, { state: { peer } });
  };

  const isChatRoute = Boolean(peerId || chatRoomId);

  return (
    <AppShell
      className={isChatRoute ? styles.shellChat : undefined}
      header={{ height: 70 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <CallOverlay />

      <Header opened={opened} toggle={toggle} />

      <DashboardNavbar
        onLogout={handleLogout}
        onEditProfile={openProfile}
        onCreateRoom={() => {
          const panel = document.getElementById('room-panel');
          panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const input = document.getElementById('room-create-name') as HTMLInputElement | null;
          input?.focus();
        }}
        onStartCall={handleStartCall}
        onOpenChat={handleOpenChat}
      />

      <AppShell.Main className={isChatRoute ? styles.mainChat : undefined}>
        {peerId ? (
          <ChatScreen />
        ) : chatRoomId ? (
          <RoomChatScreen />
        ) : (
          <>
            <RoomPanel />
            <CallHistory
              calls={callHistoryData?.calls || []}
              isLoading={isCallHistoryLoading}
              isError={isCallHistoryError}
            />
          </>
        )}
      </AppShell.Main>

      <ProfileEditModal opened={profileOpened} onClose={closeProfile} />
    </AppShell>
  );
};
