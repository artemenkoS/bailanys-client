import { Avatar, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface ProfilePreviewProps {
  avatarSrc?: string;
  displayName: string;
  username: string;
}

export const ProfilePreview = ({ avatarSrc, displayName, username }: ProfilePreviewProps) => {
  const { t } = useTranslation();
  const trimmedDisplayName = displayName.trim();
  const trimmedUsername = username.trim();
  const previewName = trimmedDisplayName || trimmedUsername || t('common.noName');
  const initialSource = trimmedDisplayName || trimmedUsername || '?';

  return (
    <Group gap="sm">
      <Avatar size="lg" radius="xl" src={avatarSrc} color="indigo">
        {initialSource[0]?.toUpperCase()}
      </Avatar>
      <div>
        <Text fw={600}>{t('common.preview')}</Text>
        <Text size="sm" c="dimmed">
          {previewName}
        </Text>
      </div>
    </Group>
  );
};
