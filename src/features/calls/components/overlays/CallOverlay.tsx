import { ActionIcon, Avatar, Badge, Box, Button, Card, Group, Modal, Stack, Text } from '@mantine/core';
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconCheck,
  IconPhone,
  IconPhoneOff,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../../../services/api.service';
import { useAuthStore } from '../../../../stores/authStore';
import { useCallStore } from '../../../../stores/callStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import { useMyRooms } from '../../hooks/useMyRooms';
import { useResizablePreview } from '../../hooks/useResizablePreview';
import { useRooms } from '../../hooks/useRooms';
import { MuteMicButton } from '../shared/MuteMicButton';
import { ScreenShareButton } from '../shared/ScreenShareButton';
import styles from './CallOverlay.module.css';

export const CallOverlay = () => {
  const { t } = useTranslation();
  const incomingCall = useCallStore((state) => state.incomingCall);
  const activeCallTarget = useCallStore((state) => state.activeCallTarget);
  const status = useCallStore((state) => state.status);
  const durationSeconds = useCallStore((state) => state.durationSeconds);
  const isMicMuted = useCallStore((state) => state.isMicMuted);
  const isScreenSharing = useCallStore((state) => state.isScreenSharing);
  const isRemoteScreenSharing = useCallStore((state) => state.isRemoteScreenSharing);
  const remoteScreenStream = useCallStore((state) => state.remoteScreenStream);
  const acceptCall = useCallStore((state) => state.acceptCall);
  const stopCall = useCallStore((state) => state.stopCall);
  const toggleMicMute = useCallStore((state) => state.toggleMicMute);
  const toggleScreenShare = useCallStore((state) => state.toggleScreenShare);
  const roomStatus = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const roomMembers = useRoomCallStore((state) => state.members);
  const isRoomMicMuted = useRoomCallStore((state) => state.isMicMuted);
  const toggleRoomMicMute = useRoomCallStore((state) => state.toggleMicMute);
  const leaveRoom = useRoomCallStore((state) => state.leaveRoom);
  const { data: roomsData } = useRooms();
  const { data: myRoomsData } = useMyRooms();
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const isEnded = status === 'ended';
  const isRejected = status === 'rejected';
  const isCalling = status === 'calling';
  const isFinished = isEnded || isRejected;
  const showDuration = status === 'connected' || (isFinished && durationSeconds > 0);
  const lookupId = activeCallTarget ?? incomingCall?.from ?? null;
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  const isRemoteSharing = Boolean(remoteScreenStream) && isRemoteScreenSharing;
  const hasScreenPreview = isRemoteSharing;
  const previewLabel = useMemo(() => t('calls.screenShareRemote'), [t]);
  const showDirectCallCard = Boolean(activeCallTarget);
  const showRoomCallCard = !showDirectCallCard && Boolean(roomId);

  const {
    previewRef: screenPreviewRef,
    cardRef,
    handleResizeStart,
    isFullscreen,
    toggleFullscreen,
  } = useResizablePreview({
    enabled: hasScreenPreview,
    videoRef: screenVideoRef,
  });
  const fullscreenLabel = useMemo(
    () => (isFullscreen ? t('calls.screenFullscreenExit') : t('calls.screenFullscreenEnter')),
    [isFullscreen, t]
  );

  const canShareScreen = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return Boolean(navigator.mediaDevices?.getDisplayMedia);
  }, []);

  const { data: callUserData } = useQuery({
    queryKey: ['call-user', lookupId],
    enabled: Boolean(accessToken && lookupId),
    queryFn: async () => {
      if (!accessToken || !lookupId) return null;
      return apiService.getUserById(accessToken, lookupId);
    },
  });

  const callUser = callUserData?.user ?? null;
  const displayName =
    callUser?.display_name || callUser?.username || (lookupId ? lookupId.slice(0, 12) : t('chat.unknownUser'));
  const rooms = useMemo(() => {
    const list = roomsData?.rooms ?? [];
    const mine = myRoomsData?.rooms ?? [];
    return [...list, ...mine];
  }, [roomsData?.rooms, myRoomsData?.rooms]);
  const currentRoom = useMemo(() => {
    if (!roomId) return null;
    return rooms.find((room) => room.id === roomId) ?? null;
  }, [rooms, roomId]);
  const roomLabel = currentRoom?.name || roomId || t('rooms.chatTitle');
  const roomAvatarUrl = currentRoom?.avatarUrl ?? undefined;

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

  const getRoomThemeColor = () => {
    if (roomStatus === 'joining') return 'indigo';
    return 'green';
  };

  const getRoomStatusLabel = () => {
    if (roomStatus === 'joining') return t('rooms.callJoining');
    return t('rooms.callInProgress');
  };

  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = remoteScreenStream ?? null;
    }
  }, [remoteScreenStream]);

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
              user: displayName,
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

      {showDirectCallCard && (
        <Card
          withBorder
          shadow="xl"
          p="sm"
          className={styles.callCard}
          data-finished={isFinished}
          data-theme={getThemeColor()}
          data-screen={hasScreenPreview}
          data-fullscreen={isFullscreen}
          ref={cardRef}
        >
          <Stack gap="sm">
            {hasScreenPreview && (
              <div className={styles.screenPreview} ref={screenPreviewRef} data-fullscreen={isFullscreen}>
                {!isFullscreen && <div className={styles.resizeHandle} onPointerDown={handleResizeStart} />}
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="filled"
                  className={styles.fullscreenButton}
                  onClick={toggleFullscreen}
                  aria-label={fullscreenLabel}
                  title={fullscreenLabel}
                >
                  {isFullscreen ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
                </ActionIcon>
                <Text size="xs" fw={600} className={styles.screenLabel}>
                  {previewLabel}
                </Text>
                <video ref={screenVideoRef} autoPlay playsInline muted className={styles.screenVideo} />
                {isRemoteSharing && (
                  <Badge size="xs" color="blue" variant="filled" className={styles.screenBadge}>
                    {t('calls.screenSharing')}
                  </Badge>
                )}
              </div>
            )}

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
                    {t('calls.userLabel', { id: displayName })}
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
                  <ScreenShareButton
                    isSharing={isScreenSharing}
                    onToggle={toggleScreenShare}
                    disabled={!canShareScreen || status !== 'connected'}
                  />
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
          </Stack>
        </Card>
      )}

      {showRoomCallCard && (
        <Card withBorder shadow="xl" p="sm" className={styles.callCard} data-theme={getRoomThemeColor()}>
          <Stack gap="sm">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap" className={styles.callMeta}>
                <Avatar color={getRoomThemeColor()} radius="xl" variant="light" src={roomAvatarUrl}>
                  <IconUsersGroup size={20} />
                </Avatar>
                <div className={styles.overflowHidden}>
                  <Text size="xs" fw={700} c={getRoomThemeColor()} tt="uppercase" className={styles.statusText}>
                    {getRoomStatusLabel()}
                  </Text>
                  <Text size="sm" fw={600} truncate>
                    {roomLabel}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {t('rooms.participants', { count: roomMembers.length })}
                  </Text>
                </div>
              </Group>

              <Group gap="xs" wrap="nowrap" className={styles.callActions}>
                <MuteMicButton isMuted={isRoomMicMuted} onToggle={toggleRoomMicMute} />
                <ActionIcon
                  color="red"
                  size="xl"
                  radius="md"
                  variant="filled"
                  onClick={() => leaveRoom()}
                  className={styles.hangupButton}
                >
                  <IconPhoneOff size={22} />
                </ActionIcon>
              </Group>
            </Group>
          </Stack>
        </Card>
      )}
    </>
  );
};
