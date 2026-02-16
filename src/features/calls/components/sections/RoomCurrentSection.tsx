import { Avatar, Badge, Button, Group, Slider, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDoorExit, IconLink, IconVolume2 } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../../../services/api.service';
import { useAuthStore } from '../../../../stores/authStore';
import { useRoomCallStore } from '../../../../stores/roomCallStore';
import { useOnlineUsers } from '../../../contacts/hooks/useOnlineUsers';
import { useMyRooms } from '../../hooks/useMyRooms';
import { useRooms } from '../../hooks/useRooms';
import { MuteMicButton } from '../shared/MuteMicButton';
import styles from './RoomCurrentSection.module.css';

export const RoomCurrentSection = () => {
  const { t } = useTranslation();
  const { data: roomsData } = useRooms();
  const { data: myRoomsData } = useMyRooms();
  const { data: onlineUsers } = useOnlineUsers();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const accessToken = useAuthStore((state) => state.session?.access_token ?? '');
  const roomId = useRoomCallStore((state) => state.roomId);
  const members = useRoomCallStore((state) => state.members);
  const memberVolumes = useRoomCallStore((state) => state.peerVolumes);
  const isMicMuted = useRoomCallStore((state) => state.isMicMuted);
  const toggleMicMute = useRoomCallStore((state) => state.toggleMicMute);
  const leaveRoom = useRoomCallStore((state) => state.leaveRoom);
  const setMemberVolume = useRoomCallStore((state) => state.setPeerVolume);
  const [isLinkLoading, setIsLinkLoading] = useState(false);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  const handleCreateGuestLink = useCallback(async () => {
    if (!roomId || !accessToken || isLinkLoading) return;
    setIsLinkLoading(true);
    try {
      const response = await apiService.createRoomGuestLink(accessToken, { roomId });
      const guestToken = response.token;
      if (!guestToken) throw new Error('Guest token missing');
      const url = `${window.location.origin}/guest/${guestToken}`;

      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          copied = true;
        } catch {
          copied = false;
        }
      }

      notifications.show({
        title: t('notifications.success'),
        message: copied ? t('rooms.guestLinkCopied') : t('rooms.guestLinkReady', { url }),
        color: copied ? 'green' : 'blue',
      });
    } catch (error) {
      console.error('Failed to create guest link:', error);
      notifications.show({
        title: t('notifications.error'),
        message: t('rooms.guestLinkFailed'),
        color: 'red',
      });
    } finally {
      setIsLinkLoading(false);
    }
  }, [roomId, accessToken, isLinkLoading, t]);

  const rooms = useMemo(() => roomsData?.rooms ?? [], [roomsData?.rooms]);
  const myRooms = useMemo(() => myRoomsData?.rooms ?? [], [myRoomsData?.rooms]);

  const currentRoom = useMemo(() => {
    if (!roomId) return null;
    return rooms.find((room) => room.id === roomId) ?? myRooms.find((room) => room.id === roomId) ?? null;
  }, [rooms, myRooms, roomId]);

  const roomLabel = useMemo(() => {
    if (!roomId) return '';
    return currentRoom?.name ?? roomId;
  }, [currentRoom, roomId]);

  const roomAvatarUrl = currentRoom?.avatarUrl ?? null;

  const profileById = useMemo(() => {
    const map = new Map<string, { displayName: string }>();
    for (const user of onlineUsers?.users ?? []) {
      const displayName = user.display_name || user.username || user.id.slice(0, 8);
      map.set(user.id, { displayName });
    }
    return map;
  }, [onlineUsers?.users]);

  const resolveMemberLabel = (id: string) => {
    if (currentUserId && id === currentUserId) return t('rooms.you');
    return profileById.get(id)?.displayName ?? id.slice(0, 8);
  };

  if (!roomId) return null;

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
          <MuteMicButton isMuted={isMicMuted} onToggle={toggleMicMute} />
          <Button
            color="indigo"
            variant="light"
            size="md"
            leftSection={<IconLink size={18} />}
            onClick={handleCreateGuestLink}
            loading={isLinkLoading}
            disabled={!accessToken}
            radius="md"
          >
            {t('rooms.guestLink')}
          </Button>
          <Button
            color="red"
            variant="light"
            size="md"
            leftSection={<IconDoorExit size={18} />}
            onClick={handleLeaveRoom}
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
                      setMemberVolume(id, value / 100);
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
