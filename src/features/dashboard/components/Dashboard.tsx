import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "../../auth/hooks/useAuth";
import { useCallManager } from "../../calls/hooks/useCallManager";
import { useCallHistory } from "../../calls/hooks/useCallHistory";
import { useRoomCallManager } from "../../calls/hooks/useRoomCallManager";

import { CallOverlay } from "../../calls/components/CallOverlay";
import { ContactList } from "../../contacts/components/ContactList";
import { CallHistory } from "../../calls/components/CallHistory";
import { RoomPanel } from "../../calls/components/RoomPanel";
import { Header } from "../../../components/Header";
import { DashboardNavbar } from "../../../components/DashboardNavbar";
import { ProfileEditModal } from "../../profile/components/ProfileEditModal";
import { useAuthStore } from "../../../stores/authStore";
import type { CreateRoomPayload } from "../../../types/rooms";

export const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.user?.id || null);
  const [opened, { toggle }] = useDisclosure();
  const [profileOpened, { open: openProfile, close: closeProfile }] =
    useDisclosure(false);
  const {
    data: callHistoryData,
    isLoading: isCallHistoryLoading,
    isError: isCallHistoryError,
  } = useCallHistory();

  const {
    status: roomStatus,
    roomId,
    members: roomMembers,
    error: roomError,
    isMicMuted: isRoomMicMuted,
    toggleMicMute: toggleRoomMicMute,
    joinRoom,
    createRoom,
    leaveRoom,
  } = useRoomCallManager();
  const isInRoom = !!roomId;
  const isRoomJoining = roomStatus === "joining";

  const notifyError = useCallback(
    (messageKey: string) => {
      notifications.show({
        title: t("notifications.error"),
        message: t(messageKey),
      });
    },
    [t],
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
    onBlockedCall: () => notifyError("rooms.errors.leaveRoomToCall"),
  });

  const handleStartCall = useCallback(
    (targetId: string, callType: "audio" | "video") => {
      if (isInRoom) {
        notifyError("rooms.errors.leaveRoomToCall");
        return;
      }
      startCall(targetId, callType);
    },
    [isInRoom, notifyError, startCall],
  );

  const handleCreateRoom = useCallback(
    (payload: CreateRoomPayload) => {
      if (callStatus !== "idle") {
        notifyError("rooms.errors.leaveCallToJoin");
        return null;
      }
      if (isInRoom) return null;
      const generated = uuidv4();
      const { avatarFile, ...roomPayload } = payload;
      createRoom(generated, roomPayload);
      return generated;
    },
    [callStatus, isInRoom, notifyError, createRoom],
  );

  const handleJoinRoom = useCallback(
    (nextRoomId: string, password?: string) => {
      if (callStatus !== "idle") {
        notifyError("rooms.errors.leaveCallToJoin");
        return;
      }
      if (isInRoom) return;
      joinRoom(nextRoomId, { password });
    },
    [callStatus, notifyError, joinRoom, isInRoom],
  );

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  const handleLogout = () => {
    leaveRoom();
    cleanup();
    logout();
    navigate("/login");
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <CallOverlay
        incomingCall={incomingCall}
        activeCallTarget={activeCallTarget}
        onAccept={acceptCall}
        onReject={() => stopCall("rejected")}
        onHangup={() => stopCall("ended")}
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
          const panel = document.getElementById("room-panel");
          panel?.scrollIntoView({ behavior: "smooth", block: "start" });
          const input = document.getElementById(
            "room-create-name",
          ) as HTMLInputElement | null;
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
          isMicMuted={isRoomMicMuted}
          onToggleMute={toggleRoomMicMute}
          error={roomError}
          isDisabled={callStatus !== "idle" || isRoomJoining}
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
