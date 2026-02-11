import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef } from 'react';
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
  const closePasswordModal = useRoomUiStore((state) => state.closePasswordModal);

  const form = useForm({
    initialValues: {
      password: '',
    },
    validate: {
      password: (value) => (value.trim() ? null : t('rooms.errors.passwordRequired')),
    },
  });
  const formRef = useRef(form);

  const isInRoom = Boolean(roomId);
  const isRoomJoining = roomStatus === 'joining';
  const isDisabled = callStatus !== 'idle' || isRoomJoining;
  const showServerError = roomError && !form.errors.password;
  const passwordRoomId = passwordRoom?.id ?? null;

  useEffect(() => {
    if (isInRoom && passwordModalOpen) {
      closePasswordModal();
    }
  }, [isInRoom, passwordModalOpen, closePasswordModal]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    if (!passwordModalOpen) {
      formRef.current.reset();
    }
  }, [passwordModalOpen]);

  useEffect(() => {
    if (passwordRoomId) {
      formRef.current.setFieldValue('password', '');
      formRef.current.clearErrors();
    }
  }, [passwordRoomId]);

  const handleClose = () => {
    closePasswordModal();
  };

  const handleSubmit = () => {
    if (!passwordRoom) return;
    const validation = form.validate();
    if (validation.hasErrors) return;
    const password = form.values.password.trim();
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
          {...form.getInputProps('password')}
          error={form.errors.password}
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
