import { Avatar, Badge, Button, Group, rem,Stack, Text } from '@mantine/core';
import { IconDoorExit } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { MuteMicButton } from './MuteMicButton';

interface RoomCurrentSectionProps {
  roomLabel: string;
  roomAvatarUrl?: string | null;
  members: string[];
  currentUserId?: string | null;
  isMicMuted: boolean;
  onToggleMute: () => void;
  onLeaveRoom: () => void;
  resolveMemberLabel: (id: string) => string;
}

export const RoomCurrentSection = ({
  roomLabel,
  roomAvatarUrl,
  members,
  currentUserId,
  isMicMuted,
  onToggleMute,
  onLeaveRoom,
  resolveMemberLabel,
}: RoomCurrentSectionProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Avatar size="sm" radius="md" src={roomAvatarUrl || undefined} color="indigo">
            {roomLabel?.[0]?.toUpperCase() ?? '#'}
          </Avatar>
          <Text size="sm" fw={600}>
            {t('rooms.currentRoom', { id: roomLabel })}
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <MuteMicButton isMuted={isMicMuted} onToggle={onToggleMute} />
          <Button
            color="red"
            variant="light"
            leftSection={<IconDoorExit size={18} />}
            onClick={onLeaveRoom}
            radius="md"
          >
            {t('rooms.leave')}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed" style={{ letterSpacing: rem(0.3) }}>
        {t('rooms.participants', { count: members.length })}
      </Text>
      <Group gap="xs" wrap="wrap">
        {members.map((id) => (
          <Badge
            key={id}
            color={id === currentUserId ? 'indigo' : 'gray'}
            variant={id === currentUserId ? 'filled' : 'light'}
          >
            {resolveMemberLabel(id)}
          </Badge>
        ))}
      </Group>
    </Stack>
  );
};
