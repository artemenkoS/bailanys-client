import { ActionIcon, Avatar, Badge, Button, Card, Group, rem,Text, Tooltip } from '@mantine/core';
import { IconPhone,IconVideo } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import type { Profile } from '../../../types/auth';

interface ContactCardProps {
  user: Profile;
  onStartCall: (targetUserId: string, type: 'video' | 'audio') => void;
}

export const ContactCard = ({ user, onStartCall }: ContactCardProps) => {
  const { t } = useTranslation();
  const displayName = user.display_name || user.username;
  const statusLabel =
    user.status === 'in-call'
      ? t('common.inCall')
      : user.status === 'busy'
        ? t('common.busy')
        : user.status === 'offline'
          ? t('common.offline')
          : t('common.online');
  const statusColor =
    user.status === 'in-call'
      ? 'red'
      : user.status === 'busy'
        ? 'yellow'
        : user.status === 'offline'
          ? 'gray'
          : 'green';
  const canCall = user.status === 'online';

  return (
    <Card
      shadow="sm"
      p="lg"
      radius="lg"
      withBorder
      style={{
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
      }}
    >
      <Group mb="xl" wrap="nowrap">
        <Avatar src={user.avatar_url} size="xl" radius="md" color="indigo" variant="light">
          {user.username[0].toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Text fw={700} size="lg" truncate="end">
            {displayName}
          </Text>
          <Text size="xs" c="dimmed" mb={5}>
            @{user.username}
          </Text>
          <Badge color={statusColor} variant="light" size="xs">
            {statusLabel}
          </Badge>
        </div>
      </Group>

      <Group gap="sm">
        <Button
          variant="filled"
          color="indigo"
          style={{ flex: 1 }}
          leftSection={<IconVideo size={18} />}
          radius="md"
          onClick={() => onStartCall(user.id, 'video')}
          disabled
        >
          {t('common.videoCall')}
        </Button>

        <Tooltip label={canCall ? t('common.audioCall') : statusLabel} withArrow position="bottom">
          <ActionIcon
            variant="light"
            color="indigo"
            size={rem(42)}
            radius="md"
            onClick={() => onStartCall(user.id, 'audio')}
            disabled={!canCall}
          >
            <IconPhone size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );
};
