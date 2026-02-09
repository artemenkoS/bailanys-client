import {
  AppShell,
  Text,
  Card,
  Group,
  Avatar,
  Badge,
  ActionIcon,
  ScrollArea,
  Stack,
  Button,
  rem,
} from "@mantine/core";
import { IconSettings, IconPlus, IconLogout } from "@tabler/icons-react";
import { useProfile } from "../features/profile/hooks/useProfile";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "react-i18next";

interface DashboardNavbarProps {
  onLogout: () => void;
  onEditProfile: () => void;
  onCreateRoom: () => void;
}

export const DashboardNavbar = ({
  onLogout,
  onEditProfile,
  onCreateRoom,
}: DashboardNavbarProps) => {
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const displayName =
    profile?.display_name ||
    (user?.user_metadata?.display_name as string) ||
    user?.email ||
    t("common.noName");
  const username =
    profile?.username || (user?.user_metadata?.username as string) || "";
  const avatarUrl = profile?.avatar_url || undefined;
  const initialsSource = displayName || username || user?.email || "?";
  const status = profile?.status ?? "online";
  const statusLabels: Record<string, string> = {
    "in-call": t("common.inCall"),
    busy: t("common.busy"),
    offline: t("common.offline"),
    online: t("common.online"),
  };
  const statusColors: Record<string, string> = {
    "in-call": "red",
    busy: "yellow",
    offline: "gray",
    online: "green",
  };
  const statusLabel = statusLabels[status] ?? t("common.online");
  const statusColor = statusColors[status] ?? "green";

  return (
    <AppShell.Navbar p="md">
      <AppShell.Section>
        <Text fw={700} c="dimmed" size="xs" tt="uppercase" mb="lg" pl={5}>
          {t("nav.myProfile")}
        </Text>
        <Card withBorder radius="md" p="sm" mb="xl">
          <Group wrap="nowrap">
            <Avatar color="indigo" radius="xl" size="md" src={avatarUrl}>
              {initialsSource?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <Text size="sm" fw={600} truncate="end">
                {displayName}
              </Text>
              <Badge color={statusColor} variant="dot" size="xs">
                {statusLabel}
              </Badge>
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={onEditProfile}
              aria-label={t("profile.editTitle")}
            >
              <IconSettings size={16} />
            </ActionIcon>
          </Group>
        </Card>
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} mx="-md" px="md">
        <Stack gap="xs" px="md">
          <Button
            variant="light"
            color="indigo"
            fullWidth
            leftSection={<IconPlus size={18} />}
            radius="md"
            onClick={onCreateRoom}
          >
            {t("nav.createRoom")}
          </Button>
        </Stack>
      </AppShell.Section>

      <AppShell.Section
        pt="md"
        style={{ borderTop: `${rem(1)} solid var(--mantine-color-dark-4)` }}
      >
      <Button
        fullWidth
        variant="subtle"
        color="red.8"
        leftSection={<IconLogout size={18} />}
        onClick={onLogout}
      >
        {t("nav.signOut")}
      </Button>
      </AppShell.Section>
    </AppShell.Navbar>
  );
};
