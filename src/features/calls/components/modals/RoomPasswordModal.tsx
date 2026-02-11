import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import { useRoomUiStore } from '../../stores/roomUiStore';

export const RoomPasswordModal = () => {
  const { t } = useTranslation();
  const callStatus = useCallStore((state) => state.status);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const roomError = useRoomCallStore((state) => state.error);
  const joinRoom = useRoomCallStore((state) => state.joinRoom);
  const passwordModalOpen = useRoomUiStore((state) => state.passwordModalOpen);
  const passwordRoom = useRoomUiStore((state) => state.passwordRoom);
  const passwordInput = useRoomUiStore((state) => state.passwordInput);
  const passwordError = useRoomUiStore((state) => state.passwordError);
  const closePasswordModal = useRoomUiStore((state) => state.closePasswordModal);
  const setPasswordInput = useRoomUiStore((state) => state.setPasswordInput);
  const setPasswordError = useRoomUiStore((state) => state.setPasswordError);

  const isInRoom = Boolean(roomId);
  const isRoomJoining = roomStatus === 'joining';
  const isDisabled = callStatus !== 'idle' || isRoomJoining;
  const showServerError = roomError && roomError !== passwordError;

  useEffect(() => {
    if (isInRoom && passwordModalOpen) {
      closePasswordModal();
    }
  }, [isInRoom, passwordModalOpen, closePasswordModal]);

  const handleClose = () => {
    closePasswordModal();
  };

  const handleSubmit = () => {
    if (!passwordRoom) return;
    const password = passwordInput.trim();
    if (!password) {
      setPasswordError('rooms.errors.passwordRequired');
      return;
    }
    setPasswordError(null);
    if (callStatus !== 'idle') {
      notifications.show({
        title: t('notifications.error'),
        message: t('rooms.errors.leaveCallToJoin'),
      });
      return;
    }
    if (isInRoom) return;
    joinRoom(passwordRoom.id, { password });
  };

  return (
    <Modal opened={passwordModalOpen && !isInRoom} onClose={handleClose} title={t('rooms.passwordModalTitle')} centered>
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          {passwordRoom?.name ?? ''}
        </Text>
        <PasswordInput
          label={t('rooms.passwordLabel')}
          placeholder={t('rooms.passwordPlaceholder')}
          value={passwordInput}
          onChange={(e) => {
            setPasswordInput(e.currentTarget.value);
            if (passwordError) setPasswordError(null);
          }}
          error={passwordError ? t(passwordError) : undefined}
          disabled={isDisabled}
        />
        {showServerError && (
          <Text size="sm" c="red" fw={500}>
            {t(roomError)}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isDisabled}>
            {t('rooms.join')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
