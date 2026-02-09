import { Button, FileInput, PasswordInput, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CreateRoomPayload } from '../../../types/rooms';

interface RoomCreateSectionProps {
  disabled?: boolean;
  onCreate: (payload: CreateRoomPayload) => void;
}

export const RoomCreateSection = ({ disabled, onCreate }: RoomCreateSectionProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarChange = (file: File | null) => {
    setAvatarError(null);
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profile.onlyImages'));
      setAvatarFile(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t('profile.maxFileSize'));
      setAvatarFile(null);
      return;
    }
    setAvatarFile(file);
  };

  const handleCreate = () => {
    if (avatarError) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorKey('rooms.errors.nameRequired');
      return;
    }
    const isPrivate = privacy === 'private';
    const trimmedPassword = password.trim();
    if (isPrivate && !trimmedPassword) {
      setErrorKey('rooms.errors.passwordRequired');
      return;
    }
    setErrorKey(null);
    onCreate({
      name: trimmedName,
      isPrivate,
      password: isPrivate ? trimmedPassword : undefined,
      avatarFile,
    });
  };

  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        {t('rooms.createTitle')}
      </Text>
      <TextInput
        id="room-create-name"
        label={t('rooms.nameLabel')}
        placeholder={t('rooms.namePlaceholder')}
        value={name}
        onChange={(e) => {
          setName(e.currentTarget.value);
          if (errorKey) setErrorKey(null);
        }}
        disabled={disabled}
      />
      <SegmentedControl
        fullWidth
        value={privacy}
        onChange={(value) => {
          const next = value as 'public' | 'private';
          setPrivacy(next);
          if (next === 'public') {
            setPassword('');
          }
          if (errorKey) setErrorKey(null);
        }}
        data={[
          { label: t('rooms.privacyPublic'), value: 'public' },
          { label: t('rooms.privacyPrivate'), value: 'private' },
        ]}
        disabled={disabled}
      />
      {privacy === 'private' && (
        <PasswordInput
          label={t('rooms.passwordLabel')}
          placeholder={t('rooms.passwordPlaceholder')}
          value={password}
          onChange={(e) => {
            setPassword(e.currentTarget.value);
            if (errorKey) setErrorKey(null);
          }}
          disabled={disabled}
        />
      )}
      <FileInput
        label={t('rooms.avatarLabel')}
        placeholder={t('rooms.avatarPlaceholder')}
        description={t('rooms.avatarOptional')}
        accept="image/*"
        value={avatarFile}
        onChange={handleAvatarChange}
        error={avatarError}
        clearable
        disabled={disabled}
      />
      <Button leftSection={<IconPlus size={18} />} onClick={handleCreate} radius="md" disabled={disabled}>
        {t('rooms.create')}
      </Button>
      {errorKey && (
        <Text size="sm" c="red" fw={500}>
          {t(errorKey)}
        </Text>
      )}
    </Stack>
  );
};
