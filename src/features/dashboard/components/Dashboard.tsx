import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DashboardNavbar } from '../../../components/DashboardNavbar';
import { Header } from '../../../components/Header';
import { useAuthStore } from '../../../stores/authStore';
import { useAuth } from '../../auth/hooks/useAuth';
import { CallHistory } from '../../calls/components/CallHistory';
import { CallOverlay } from '../../calls/components/CallOverlay';
import { RoomPanel } from '../../calls/components/RoomPanel';
import { useCallHistory } from '../../calls/hooks/useCallHistory';
import { useCallManager } from '../../calls/hooks/useCallManager';
import { useCreateRoom } from '../../calls/hooks/useCreateRoom';
import { useRoomCallManager } from '../../calls/hooks/useRoomCallManager';
import { ContactList } from '../../contacts/components/ContactList';
import { ProfileEditModal } from '../../profile/components/ProfileEditModal';

export const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.user?.id || null);
  const [opened, { toggle }] = useDisclosure();
  const [profileOpened, { open: openProfile, close: closeProfile }] = useDisclosure(false);
  const { data: callHistoryData, isLoading: isCallHistoryLoading, isError: isCallHistoryError } = useCallHistory();

  const {
    status: roomStatus,
    roomId,
    members: roomMembers,
    error: roomError,
    isMicMuted: isRoomMicMuted,
    toggleMicMute: toggleRoomMicMute,
    peerVolumes,
    setPeerVolume,
    joinRoom,
    createRoom,
    leaveRoom,
  } = useRoomCallManager();
  const isInRoom = !!roomId;
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

  const {
    incomingCall,
    activeCallTarget,
    startCall,
    acceptCall,
    stopCall,
    cleanup,
    status: callStatus,
    callDurationSeconds,
    isMicMuted,
    toggleMicMute,
  } = useCallManager({
    isCallBlocked: isInRoom,
    onBlockedCall: () => notifyError('rooms.errors.leaveRoomToCall'),
  });

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

  const handleCreateRoom = useCreateRoom({
    callStatus,
    isInRoom,
    notifyError,
    createRoom,
  });

  const handleJoinRoom = useCallback(
    (nextRoomId: string, password?: string) => {
      if (callStatus !== 'idle') {
        notifyError('rooms.errors.leaveCallToJoin');
        return;
      }
      if (isInRoom) return;
      joinRoom(nextRoomId, { password });
    },
    [callStatus, notifyError, joinRoom, isInRoom]
  );

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  const handleLogout = () => {
    leaveRoom();
    cleanup();
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <CallOverlay
        incomingCall={incomingCall}
        activeCallTarget={activeCallTarget}
        onAccept={acceptCall}
        onReject={() => stopCall('rejected')}
        onHangup={() => stopCall('ended')}
        status={callStatus}
        durationSeconds={callDurationSeconds}
        isMicMuted={isMicMuted}
        onToggleMute={toggleMicMute}
      />

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
      />

      <AppShell.Main>
        <RoomPanel
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onLeaveRoom={handleLeaveRoom}
          isInRoom={isInRoom}
          roomId={roomId}
          members={roomMembers}
          memberVolumes={peerVolumes}
          onMemberVolumeChange={setPeerVolume}
          isMicMuted={isRoomMicMuted}
          onToggleMute={toggleRoomMicMute}
          error={roomError}
          isDisabled={callStatus !== 'idle' || isRoomJoining}
          currentUserId={currentUserId}
        />
        <ContactList onStartCall={handleStartCall} />
        <CallHistory
          calls={callHistoryData?.calls || []}
          isLoading={isCallHistoryLoading}
          isError={isCallHistoryError}
        />
      </AppShell.Main>

      <ProfileEditModal opened={profileOpened} onClose={closeProfile} />
    </AppShell>
  );
};
