import {
  Badge,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
  rem,
} from "@mantine/core";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPhoneOff,
} from "@tabler/icons-react";
import type {
  CallHistoryItem,
  CallHistoryStatus,
} from "../../../types/callHistory";

interface CallHistoryProps {
  calls: CallHistoryItem[];
  isLoading: boolean;
  isError: boolean;
}

const statusLabels: Record<CallHistoryStatus, string> = {
  completed: "Completed",
  missed: "Missed",
  rejected: "Rejected",
  failed: "Failed",
};

const statusColors: Record<CallHistoryStatus, string> = {
  completed: "green",
  missed: "orange",
  rejected: "red",
  failed: "gray",
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const ss = (safe % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

export const CallHistory = ({ calls, isLoading, isError }: CallHistoryProps) => (
  <Container size="xl" px={{ base: "xs", sm: "md" }}>
    <Stack gap="md" mt="md">
      <Title order={2} fw={800} style={{ fontSize: rem(24) }}>
        Call History
      </Title>

      {isLoading ? (
        <Center h={120}>
          <Loader color="indigo" />
        </Center>
      ) : isError ? (
        <Center h={120}>
          <Text c="red" fw={500}>
            Failed to load call history.
          </Text>
        </Center>
      ) : calls.length === 0 ? (
        <Center h={120}>
          <Text c="dimmed">No calls yet.</Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {calls.map((call) => {
            const displayName =
              call.peer?.display_name ||
              call.peer?.username ||
              call.peer_id.slice(0, 12);
            const subtitle = new Date(call.started_at).toLocaleString();

            return (
              <Card key={call.id} withBorder radius="md" p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      variant="light"
                      color={call.direction === "incoming" ? "teal" : "indigo"}
                      radius="xl"
                      size="lg"
                    >
                      {call.direction === "incoming" ? (
                        <IconArrowDownLeft size={18} />
                      ) : (
                        <IconArrowUpRight size={18} />
                      )}
                    </ThemeIcon>
                    <div style={{ overflow: "hidden" }}>
                      <Text fw={600} size="sm" truncate>
                        {displayName}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {subtitle}
                      </Text>
                    </div>
                  </Group>

                  <Stack gap={4} align="flex-end">
                    <Group gap={6}>
                      <IconPhoneOff size={14} color="var(--mantine-color-gray-6)" />
                      <Text size="sm" fw={600}>
                        {formatDuration(call.duration_seconds)}
                      </Text>
                    </Group>
                    <Badge
                      color={statusColors[call.status]}
                      variant="light"
                      size="xs"
                    >
                      {statusLabels[call.status]}
                    </Badge>
                  </Stack>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  </Container>
);
