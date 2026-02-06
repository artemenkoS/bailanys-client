import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import { useOnlineUsers } from "../../contacts/hooks/useOnlineUsers";
import { useCallManager } from "../../calls/hooks/useCallManager";
import { useCallHistory } from "../../calls/hooks/useCallHistory";

import { CallOverlay } from "../../calls/components/CallOverlay";
import { ContactList } from "../../contacts/components/ContactList";
import { CallHistory } from "../../calls/components/CallHistory";
import { Header } from "../../../components/Header";
import { DashboardNavbar } from "../../../components/DashboardNavbar";
import { ProfileEditModal } from "../../profile/components/ProfileEditModal";

export const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [opened, { toggle }] = useDisclosure();
  const [profileOpened, { open: openProfile, close: closeProfile }] =
    useDisclosure(false);
  const { data, isLoading, isError } = useOnlineUsers();
  const {
    data: callHistoryData,
    isLoading: isCallHistoryLoading,
    isError: isCallHistoryError,
  } = useCallHistory();

  const {
    incomingCall,
    activeCallTarget,
    startCall,
    acceptCall,
    stopCall,
    cleanup,
    status,
    callDurationSeconds,
    isMicMuted,
    toggleMicMute,
  } = useCallManager();

  const handleLogout = () => {
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
        status={status}
        durationSeconds={callDurationSeconds}
        isMicMuted={isMicMuted}
        onToggleMute={toggleMicMute}
      />

      <Header
        opened={opened}
        toggle={toggle}
        onlineCount={data?.users.length || 0}
      />

      <DashboardNavbar onLogout={handleLogout} onEditProfile={openProfile} />

      <AppShell.Main>
        <ContactList
          users={data?.users || []}
          isLoading={isLoading}
          isError={isError}
          onStartCall={startCall}
        />
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
