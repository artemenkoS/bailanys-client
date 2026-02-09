import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  rem,
} from "@mantine/core";
import { IconDoorEnter, IconDoorExit, IconPlus, IconUsers } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useOnlineUsers } from "../../contacts/hooks/useOnlineUsers";
import { MuteMicButton } from "./MuteMicButton";

interface RoomPanelProps {
  roomIdInput: string;
  onRoomIdChange: (value: string) => void;
  onJoinRoom: () => void;
  onCreateRoom: () => void;
  onLeaveRoom: () => void;
  isInRoom: boolean;
  roomId: string | null;
  members: string[];
  isMicMuted: boolean;
  onToggleMute: () => void;
  error?: string | null;
  isDisabled?: boolean;
  currentUserId?: string | null;
}

export const RoomPanel = ({
  roomIdInput,
  onRoomIdChange,
  onJoinRoom,
  onCreateRoom,
  onLeaveRoom,
  isInRoom,
  roomId,
  members,
  isMicMuted,
  onToggleMute,
  error,
  isDisabled,
  currentUserId,
}: RoomPanelProps) => {
  const { t } = useTranslation();
  const { data } = useOnlineUsers();

  const profileById = useMemo(() => {
    const map = new Map<string, { displayName: string }>();
    for (const user of data?.users ?? []) {
      const displayName =
        user.display_name || user.username || user.id.slice(0, 8);
      map.set(user.id, { displayName });
    }
    return map;
  }, [data]);

  const resolveMemberLabel = (id: string) => {
    if (currentUserId && id === currentUserId) return t("rooms.you");
    return profileById.get(id)?.displayName ?? id.slice(0, 8);
  };

  return (
    <Card withBorder radius="lg" p="md" mt={"md"}>
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <IconUsers size={18} color="var(--mantine-color-indigo-6)" />
          <Text fw={700} size="md">
            {t("rooms.title")}
          </Text>
        </Group>
        {isInRoom && roomId && (
          <Badge color="green" variant="light">
            {t("rooms.activeBadge")}
          </Badge>
        )}
      </Group>

      {!isInRoom ? (
        <Stack gap="sm">
          <TextInput
            label={t("rooms.roomIdLabel")}
            placeholder={t("rooms.roomIdPlaceholder")}
            value={roomIdInput}
            onChange={(e) => onRoomIdChange(e.currentTarget.value)}
            disabled={isDisabled}
          />
          <Group gap="sm">
            <Button
              leftSection={<IconDoorEnter size={18} />}
              onClick={onJoinRoom}
              radius="md"
              disabled={isDisabled || !roomIdInput.trim()}
            >
              {t("rooms.join")}
            </Button>
            <Button
              variant="light"
              leftSection={<IconPlus size={18} />}
              onClick={onCreateRoom}
              radius="md"
              disabled={isDisabled}
            >
              {t("rooms.create")}
            </Button>
          </Group>
          {error && (
            <Text size="sm" c="red" fw={500}>
              {t(error)}
            </Text>
          )}
        </Stack>
      ) : (
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={600}>
              {t("rooms.currentRoom", { id: roomId })}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <MuteMicButton isMuted={isMicMuted} onToggle={onToggleMute} />
              <Button
                color="red"
                variant="light"
                leftSection={<IconDoorExit size={18} />}
                onClick={onLeaveRoom}
                radius="md"
              >
                {t("rooms.leave")}
              </Button>
            </Group>
          </Group>

          <Text size="xs" c="dimmed" style={{ letterSpacing: rem(0.3) }}>
            {t("rooms.participants", { count: members.length })}
          </Text>
          <Group gap="xs" wrap="wrap">
            {members.map((id) => (
              <Badge
                key={id}
                color={id === currentUserId ? "indigo" : "gray"}
                variant={id === currentUserId ? "filled" : "light"}
              >
                {resolveMemberLabel(id)}
              </Badge>
            ))}
          </Group>
        </Stack>
      )}
    </Card>
  );
};
