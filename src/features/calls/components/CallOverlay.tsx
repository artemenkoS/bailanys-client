import { ActionIcon, Avatar, Box,Button, Card, Group, Modal, rem, Stack, Text } from '@mantine/core';
import { IconCheck, IconPhone, IconPhoneOff, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import type { DirectSignalingMessage } from '../../../types/signaling';
import type { CallStatus } from '../hooks/useCallManager';
import { MuteMicButton } from './MuteMicButton';

interface CallOverlayProps {
  incomingCall: DirectSignalingMessage | null;
  activeCallTarget: string | null;
  status: CallStatus;
  durationSeconds: number;
  isMicMuted: boolean;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
}

export const CallOverlay = ({
  incomingCall,
  activeCallTarget,
  status,
  durationSeconds,
  isMicMuted,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
}: CallOverlayProps) => {
  const { t } = useTranslation();
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
        onClose={onReject}
        title={t('calls.incomingAudio')}
        centered
        withCloseButton={false}
        closeOnClickOutside={false}
        overlayProps={{ backgroundOpacity: 0.5, blur: 3 }}
      >
        <Stack align="center" py="xl">
          <Box
            style={{
              animation: 'pulse 1.5s infinite ease-in-out',
              borderRadius: '50%',
            }}
          >
            <Avatar size="xl" radius="xl" color="indigo" variant="light">
              <IconPhone size={40} />
            </Avatar>
          </Box>
          <Text fw={700} size="lg" ta="center">
            {t('calls.callingFrom', {
              user: incomingCall?.from?.slice(0, 8) ?? '',
            })}
          </Text>
          <Group mt="lg" grow style={{ width: '100%' }}>
            <Button color="green" size="md" leftSection={<IconPhone size={20} />} onClick={onAccept} radius="md">
              {t('calls.accept')}
            </Button>
            <Button
              color="red"
              variant="light"
              size="md"
              leftSection={<IconX size={20} />}
              onClick={onReject}
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
          style={{
            position: 'fixed',
            bottom: rem(20),
            right: rem(20),
            left: rem(20),
            maxWidth: rem(340),
            marginLeft: 'auto',
            zIndex: 1000,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isFinished ? 'scale(1.02)' : 'scale(1)',
            borderLeft: `${rem(5)} solid var(--mantine-color-${getThemeColor()}-6)`,
            backgroundColor: isFinished ? 'var(--mantine-color-red-0)' : 'var(--mantine-color-white)',
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Avatar color={getThemeColor()} radius="xl" variant={isFinished ? 'filled' : 'light'}>
                {isFinished ? <IconX size={20} /> : <IconPhone size={20} />}
              </Avatar>
              <div style={{ overflow: 'hidden' }}>
                <Text size="xs" fw={700} c={getThemeColor()} tt="uppercase" style={{ letterSpacing: rem(0.5) }}>
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
              <Group gap="xs" wrap="nowrap">
                <MuteMicButton isMuted={isMicMuted} onToggle={onToggleMute} />
                <ActionIcon
                  color="red"
                  size="xl"
                  radius="md"
                  variant="filled"
                  onClick={onHangup}
                  style={{ transition: 'transform 0.2s ease' }}
                >
                  <IconPhoneOff size={22} />
                </ActionIcon>
              </Group>
            )}

            {isFinished && <IconCheck size={24} color="var(--mantine-color-red-6)" style={{ opacity: 0.7 }} />}
          </Group>
        </Card>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(76, 110, 245, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(76, 110, 245, 0); }
          100% { box-shadow: 0 0 0 0 rgba(76, 110, 245, 0); }
        }
      `}</style>
    </>
  );
};
