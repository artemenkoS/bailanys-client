import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface RoomPasswordModalProps {
  opened: boolean;
  roomName?: string | null;
  password: string;
  passwordErrorKey?: string | null;
  serverErrorKey?: string | null;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const RoomPasswordModal = ({
  opened,
  roomName,
  password,
  passwordErrorKey,
  serverErrorKey,
  onPasswordChange,
  onCancel,
  onSubmit,
  disabled,
}: RoomPasswordModalProps) => {
  const { t } = useTranslation();
  const showServerError = serverErrorKey && serverErrorKey !== passwordErrorKey;

  return (
    <Modal opened={opened} onClose={onCancel} title={t('rooms.passwordModalTitle')} centered>
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          {roomName ?? ''}
        </Text>
        <PasswordInput
          label={t('rooms.passwordLabel')}
          placeholder={t('rooms.passwordPlaceholder')}
          value={password}
          onChange={(e) => onPasswordChange(e.currentTarget.value)}
          error={passwordErrorKey ? t(passwordErrorKey) : undefined}
          disabled={disabled}
        />
        {showServerError && (
          <Text size="sm" c="red" fw={500}>
            {t(serverErrorKey)}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={disabled}>
            {t('rooms.join')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
