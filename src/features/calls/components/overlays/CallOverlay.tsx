import { ActionIcon, Avatar, Box, Button, Card, Group, Modal, Stack, Text } from '@mantine/core';
import { IconCheck, IconPhone, IconPhoneOff, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useCallStore } from '../../../../stores/callStore';
import { MuteMicButton } from '../shared/MuteMicButton';
import styles from './CallOverlay.module.css';

export const CallOverlay = () => {
  const { t } = useTranslation();
  const incomingCall = useCallStore((state) => state.incomingCall);
  const activeCallTarget = useCallStore((state) => state.activeCallTarget);
  const status = useCallStore((state) => state.status);
  const durationSeconds = useCallStore((state) => state.durationSeconds);
  const isMicMuted = useCallStore((state) => state.isMicMuted);
  const acceptCall = useCallStore((state) => state.acceptCall);
  const stopCall = useCallStore((state) => state.stopCall);
  const toggleMicMute = useCallStore((state) => state.toggleMicMute);
  const isEnded = status === 'ended';
  const isRejected = status === 'rejected';
  const isCalling = status === 'calling';
  const isFinished = isEnded || isRejected;
  const showDuration = status === 'connected' || (isFinished && durationSeconds > 0);

  const formatDuration = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const mm = Math.floor(safe / 60)
      .toString()
      .padStart(2, '0');
    const ss = (safe % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const getThemeColor = () => {
    if (isFinished) return 'red';
    if (isCalling) return 'indigo';
    return 'green';
  };

  const getStatusLabel = () => {
    if (isEnded) return t('calls.callEnded');
    if (isRejected) return t('calls.callRejected');
    if (isCalling) return t('calls.calling');
    return t('calls.inCall');
  };

  return (
    <>
      <Modal
        opened={!!incomingCall && status === 'idle'}
        onClose={() => stopCall('rejected')}
        title={t('calls.incomingAudio')}
        centered
        withCloseButton={false}
        closeOnClickOutside={false}
        overlayProps={{ backgroundOpacity: 0.5, blur: 3 }}
      >
        <Stack align="center" py="xl">
          <Box className={styles.pulseRing}>
            <Avatar size="xl" radius="xl" color="indigo" variant="light">
              <IconPhone size={40} />
            </Avatar>
          </Box>
          <Text fw={700} size="lg" ta="center">
            {t('calls.callingFrom', {
              user: incomingCall?.from?.slice(0, 8) ?? '',
            })}
          </Text>
          <Group mt="lg" grow className={styles.fullWidth}>
            <Button color="green" size="md" leftSection={<IconPhone size={20} />} onClick={acceptCall} radius="md">
              {t('calls.accept')}
            </Button>
            <Button
              color="red"
              variant="light"
              size="md"
              leftSection={<IconX size={20} />}
              onClick={() => stopCall('rejected')}
              radius="md"
            >
              {t('calls.reject')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {activeCallTarget && (
        <Card
          withBorder
          shadow="xl"
          p="sm"
          className={styles.callCard}
          data-finished={isFinished}
          data-theme={getThemeColor()}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" className={styles.callMeta}>
              <Avatar color={getThemeColor()} radius="xl" variant={isFinished ? 'filled' : 'light'}>
                {isFinished ? <IconX size={20} /> : <IconPhone size={20} />}
              </Avatar>
              <div className={styles.overflowHidden}>
                <Text size="xs" fw={700} c={getThemeColor()} tt="uppercase" className={styles.statusText}>
                  {getStatusLabel()}
                </Text>
                <Text size="sm" fw={600} truncate>
                  {t('calls.userLabel', { id: activeCallTarget.slice(0, 12) })}
                </Text>
                {showDuration && (
                  <Text size="xs" c="dimmed" mt={2}>
                    {formatDuration(durationSeconds)}
                  </Text>
                )}
              </div>
            </Group>

            {!isFinished && (
              <Group gap="xs" wrap="nowrap" className={styles.callActions}>
                <MuteMicButton isMuted={isMicMuted} onToggle={toggleMicMute} />
                <ActionIcon
                  color="red"
                  size="xl"
                  radius="md"
                  variant="filled"
                  onClick={() => stopCall('ended')}
                  className={styles.hangupButton}
                >
                  <IconPhoneOff size={22} />
                </ActionIcon>
              </Group>
            )}

            {isFinished && <IconCheck size={24} className={styles.finishedIcon} />}
          </Group>
        </Card>
      )}
    </>
  );
};
