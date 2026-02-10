import { Avatar, Badge, Button, Group, Slider, Stack, Text } from '@mantine/core';
import { IconDoorExit, IconVolume2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { MuteMicButton } from './MuteMicButton';
import styles from './RoomCurrentSection.module.css';

interface RoomCurrentSectionProps {
  roomLabel: string;
  roomAvatarUrl?: string | null;
  members: string[];
  memberVolumes: Record<string, number>;
  onMemberVolumeChange: (id: string, volume: number) => void;
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
  memberVolumes,
  onMemberVolumeChange,
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
            size="md"
            leftSection={<IconDoorExit size={18} />}
            onClick={onLeaveRoom}
            radius="md"
          >
            {t('rooms.leave')}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed" className={styles.participants}>
        {t('rooms.participants', { count: members.length })}
      </Text>
      <Stack gap="xs">
        {members.map((id) => {
          const isSelf = id === currentUserId;
          const volume = memberVolumes[id] ?? 1;
          const volumePercent = Math.round(volume * 100);
          return (
            <Group key={id} gap="sm" wrap="nowrap" className={styles.memberRow}>
              <Badge
                color={isSelf ? 'indigo' : 'gray'}
                variant={isSelf ? 'filled' : 'light'}
                className={styles.memberBadge}
              >
                {resolveMemberLabel(id)}
              </Badge>
              {!isSelf && (
                <>
                  <IconVolume2 size={16} className={styles.volumeIcon} />
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={volumePercent}
                    onChange={(value) => {
                      if (typeof value !== 'number') return;
                      onMemberVolumeChange(id, value / 100);
                    }}
                    className={styles.volumeSlider}
                    label={(value) => `${value}%`}
                    aria-label={t('rooms.memberVolume', { user: resolveMemberLabel(id) })}
                  />
                  <Text size="xs" c="dimmed" className={styles.volumeValue}>
                    {volumePercent}%
                  </Text>
                </>
              )}
            </Group>
          );
        })}
      </Stack>
    </Stack>
  );
};
