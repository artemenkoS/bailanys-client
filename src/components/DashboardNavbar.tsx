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
import type { User } from "../types/auth";

interface DashboardNavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const DashboardNavbar = ({ user, onLogout }: DashboardNavbarProps) => (
  <AppShell.Navbar p="md">
    <AppShell.Section>
      <Text fw={700} c="dimmed" size="xs" tt="uppercase" mb="lg" pl={5}>
        My Profile
      </Text>
      <Card withBorder radius="md" p="sm" mb="xl">
        <Group wrap="nowrap">
          <Avatar color="indigo" radius="xl" size="md">
            {((user?.user_metadata?.username as string) ||
              (user?.email as string))?.[0].toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Text size="sm" fw={600} truncate="end">
              {(user?.user_metadata?.display_name as string) || user?.email}
            </Text>
            <Badge color="green" variant="dot" size="xs">
              online
            </Badge>
          </div>
          <ActionIcon variant="subtle" color="gray" size="sm">
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
        >
          Create New Room
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
        Sign Out
      </Button>
    </AppShell.Section>
  </AppShell.Navbar>
);
