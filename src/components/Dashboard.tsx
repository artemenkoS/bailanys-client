import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/authStore";
import { useOnlineUsers } from "../hooks/useOnlineUsers";
import { useCallManager } from "../hooks/useCallManager";
import { useCallHistory } from "../hooks/useCallHistory";

import { CallOverlay } from "./CallOverlay";
import { DashboardNavbar } from "./DashboardNavbar";
import { ContactList } from "./ContactList";
import { CallHistory } from "./CallHistory";
import { Header } from "./Header";

export const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [opened, { toggle }] = useDisclosure();
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
      />

      <Header
        opened={opened}
        toggle={toggle}
        onlineCount={data?.users.length || 0}
      />

      <DashboardNavbar user={user} onLogout={handleLogout} />

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
    </AppShell>
  );
};
